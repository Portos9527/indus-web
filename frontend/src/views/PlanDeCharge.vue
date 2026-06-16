<template>
  <div class="pdc-page">
    <div class="page-header">
      <h1>📈 Plan de Charge</h1>
      <button class="btn" style="background:#fffbeb;border:1px solid #fcd34d;color:#92400e" @click="congesModal=true">🏖️ Congés</button>
    </div>

    <div class="pdc-legend">
      <span class="lg"><span class="dot" style="background:#ef4444"></span>Urgente</span>
      <span class="lg"><span class="dot" style="background:#3b82f6"></span>Normale</span>
      <span class="lg"><span class="hatch masque"></span>Temps masqué (attente)</span>
      <span class="lg"><span class="hatch conge"></span>Congés</span>
      <span class="lg"><span style="width:2px;height:14px;background:#ef4444;display:inline-block"></span>Aujourd'hui</span>
    </div>

    <div class="gantt-outer">
      <div class="gantt-inner" :style="{ width: (LEFT + weeks.length*WEEK_W) + 'px' }">
        <!-- En-tête -->
        <div class="g-thead">
          <div class="g-corner">Technicien</div>
          <div class="g-weeks" :style="{ width: weeks.length*WEEK_W + 'px' }">
            <div v-for="(w,i) in weeks" :key="i" class="g-wk" :style="{ left: i*WEEK_W+'px', width: WEEK_W+'px' }" :class="{ cur: w.cur }">
              <div class="g-wk-l">S.{{ w.num }}</div><div class="g-wk-s">{{ w.label }}</div>
            </div>
            <div class="g-today-hd" :style="{ left: todayX+'px' }"></div>
          </div>
        </div>
        <!-- Lignes -->
        <div v-for="tech in techs" :key="tech.id" class="g-row" :style="{ height: rowH(tech)+'px' }">
          <div class="g-left">
            <div class="g-av" :style="{ background: color(tech.id) }">{{ ini(tech.nom_affiche) }}</div>
            <div><div class="g-name">{{ tech.nom_affiche }}</div><div class="g-meta">{{ tech.demandes.length }} active(s)</div></div>
          </div>
          <div class="g-timeline" :style="{ width: weeks.length*WEEK_W+'px', height: rowH(tech)+'px' }">
            <div v-for="(w,i) in weeks" :key="i" class="g-stripe" :class="{ even:i%2===0, cur:w.cur }" :style="{ left:i*WEEK_W+'px', width:WEEK_W+'px' }"></div>
            <div v-for="c in congesFor(tech.id)" :key="'c'+c.id" class="g-conge" :style="bandStyle(c.date_debut, c.date_fin)" :title="'Congés '+c.motif">🏖️</div>
            <div class="g-today" :style="{ left: todayX+'px' }"></div>
            <template v-for="(d,lane) in tech.demandes" :key="d.id">
              <div class="g-bar" :class="prioClass(d.priorite)" :style="barStyle(d,lane)" :title="d.titre" @click="openDetail(d)">
                <div class="g-bar-prog" :style="{ width: (d.avancement||0)+'%' }"></div>
                <span class="g-bar-lbl">{{ d.titre }}</span>
              </div>
              <div v-for="m in masquesFor(d.id)" :key="'m'+m.id" class="g-masque" :style="masqueStyle(m,lane)" :title="'Temps masqué '+m.motif"></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Fiche complète de la demande -->
    <DemandeModal v-if="detail" :demande="detail" @close="detail=null" @refresh="load" />

    <!-- Gestion congés -->
    <div v-if="congesModal" class="modal-overlay" @click.self="congesModal=false">
      <div class="modal" style="max-width:560px">
        <div class="modal-header"><h2>🏖️ Gestion des congés</h2><button class="btn btn-ghost btn-sm" @click="congesModal=false">✕</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Technicien</label><select v-model.number="cf.technicien_id" class="form-control"><option :value="null">—</option><option v-for="t in techs" :key="t.id" :value="t.id">{{ t.nom_affiche }}</option></select></div>
            <div class="form-group"><label class="form-label">Motif</label><select v-model="cf.motif" class="form-control"><option v-for="m in MOTIFS" :key="m">{{ m }}</option></select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Du</label><input type="date" v-model="cf.date_debut" class="form-control" /></div>
            <div class="form-group"><label class="form-label">Au</label><input type="date" v-model="cf.date_fin" class="form-control" /></div>
          </div>
          <button class="btn btn-primary btn-sm" :disabled="!cfValid" @click="addConge">➕ Ajouter</button>
          <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
            <div v-for="c in congesList" :key="c.id" style="display:flex;align-items:center;gap:10px;padding:6px 0">
              <span style="flex:1;font-size:13px"><strong>{{ c.technicien_nom }}</strong> · {{ formatDate(c.date_debut) }} → {{ formatDate(c.date_fin) }} <span style="color:var(--text-3)">({{ c.motif }})</span></span>
              <button class="btn btn-ghost btn-sm" @click="delConge(c.id)">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store, formatDate, avatarColor, initials, toastSuccess, toastError } from '../store.js'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'
import DemandeModal from '../components/DemandeModal.vue'

const WEEK_W = 130, DAY_W = WEEK_W/7, LEFT = 200, BAR_H = 22, BAR_GAP = 5, PAD = 8, NUM = 10
const techs = ref([]), congesList = ref([]), allMasques = ref([])
const detail = ref(null), congesModal = ref(false)
const MOTIFS = ['Congés payés','RTT','Formation','Maladie','Absence']
const cf = ref({ technicien_id:null, motif:'Congés payés', date_debut:'', date_fin:'' })
const cfValid = computed(() => cf.value.technicien_id && cf.value.date_debut && cf.value.date_fin && cf.value.date_fin >= cf.value.date_debut)
const todayStr = new Date().toISOString().slice(0,10)

const winStart = (() => { const n=new Date(); const dow=(n.getDay()+6)%7; const m=new Date(n); m.setDate(n.getDate()-dow-7); m.setHours(0,0,0,0); return m })()
const winEnd = (() => { const e=new Date(winStart); e.setDate(e.getDate()+NUM*7); return e })()
const weeks = computed(() => { const r=[]; for(let i=0;i<NUM;i++){ const s=new Date(winStart); s.setDate(s.getDate()+i*7); const e=new Date(s); e.setDate(s.getDate()+6); const ss=s.toISOString().slice(0,10), es=e.toISOString().slice(0,10); r.push({ num:weekNum(s), label:s.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}), cur: ss<=todayStr&&todayStr<=es }) } return r })
const todayX = computed(() => { const n=new Date(); n.setHours(0,0,0,0); return Math.round((n-winStart)/864e5*DAY_W) })

function weekNum(d){ const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dn=x.getUTCDay()||7; x.setUTCDate(x.getUTCDate()+4-dn); const y=new Date(Date.UTC(x.getUTCFullYear(),0,1)); return Math.ceil((((x-y)/864e5)+1)/7) }
function parseD(s){ if(!s) return null; const p=s.split('T')[0].split('-').map(Number); return new Date(p[0],p[1]-1,p[2]) }
function color(id){ return avatarColor(id) }
function ini(n){ return initials(n) }
function rowH(t){ const c=Math.max(1,t.demandes.length); return PAD*2+c*BAR_H+(c-1)*BAR_GAP }
function prioClass(p){ return (p||'').toLowerCase()==='urgente' ? 'p-urg' : 'p-norm' }
async function openDetail(d){
  const r = await api.detail(d.id)
  if(r.ok) detail.value = r.data
  else toastError(r.error || 'Demande introuvable')
}

function barStyle(d,lane){
  const s=parseD(d.date_creation)||winStart, e=parseD(d.date_limite)||winEnd
  const es=s<winStart?winStart:s, ee=e>winEnd?winEnd:e
  if(es>=winEnd||ee<=winStart) return { display:'none' }
  return { left:Math.round((es-winStart)/864e5*DAY_W)+'px', width:Math.max(16,Math.round((ee-es)/864e5*DAY_W))+'px', top:(PAD+lane*(BAR_H+BAR_GAP))+'px', height:BAR_H+'px' }
}
function bandStyle(deb,fin){
  let s=parseD(deb)||winStart, e=parseD(fin)||winEnd; e=new Date(e.getTime()+864e5)
  const es=s<winStart?winStart:s, ee=e>winEnd?winEnd:e
  if(es>=winEnd||ee<=winStart) return { display:'none' }
  return { left:Math.round((es-winStart)/864e5*DAY_W)+'px', width:Math.max(4,Math.round((ee-es)/864e5*DAY_W))+'px' }
}
function masqueStyle(m,lane){ const b=bandStyle(m.date_debut,m.date_fin); if(b.display) return b; return { ...b, top:(PAD+lane*(BAR_H+BAR_GAP))+'px', height:BAR_H+'px' } }
function congesFor(id){ const ws=winStart.toISOString().slice(0,10), we=winEnd.toISOString().slice(0,10); return congesList.value.filter(c=>c.technicien_id===id&&c.date_debut<=we&&c.date_fin>=ws) }
function masquesFor(id){ return allMasques.value.filter(m=>m.demande_id===id) }

async function load() {
  const [p,c,m] = await Promise.all([api.planDeCharge(), api.conges(), api.tousTempsMasque()])
  if(p.ok) techs.value=p.data
  if(c.ok) congesList.value=c.data
  if(m.ok) allMasques.value=m.data
}
let stop
onMounted(() => { load(); stop = onEntities(['demande','conge','temps_masque'], load) })
onUnmounted(() => stop && stop())

async function addConge(){
  const r = await api.ajoutConge(cf.value)
  if(r.ok){ congesList.value.unshift(r.data); cf.value={technicien_id:null,motif:'Congés payés',date_debut:'',date_fin:''}; toastSuccess('Congé ajouté') } else toastError(r.error)
}
async function delConge(id){ const r=await api.supprConge(id); if(r.ok) congesList.value=congesList.value.filter(c=>c.id!==id) }
</script>

<style scoped>
.pdc-page { padding: 24px; display: flex; flex-direction: column; gap: 14px; height: 100%; overflow: hidden; }
.pdc-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-3); flex-wrap: wrap; }
.lg { display: flex; align-items: center; gap: 5px; }
.dot { width: 11px; height: 11px; border-radius: 3px; }
.hatch { width: 20px; height: 12px; border-radius: 3px; }
.hatch.masque { background: repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0 3px,#94a3b8 3px,#94a3b8 6px); }
.hatch.conge { background: repeating-linear-gradient(45deg,#fde68a,#fde68a 3px,#f59e0b 3px,#f59e0b 6px); }
.gantt-outer { flex: 1; overflow: auto; border: 1px solid var(--border); border-radius: 12px; }
.gantt-inner { position: relative; }
.g-thead { position: sticky; top: 0; z-index: 10; display: flex; height: 48px; background: var(--bg-2,#f8fafc); border-bottom: 2px solid var(--border); }
.g-corner { position: sticky; left: 0; z-index: 12; width: 200px; min-width: 200px; background: var(--bg-2,#f8fafc); border-right: 2px solid var(--border); display: flex; align-items: center; padding: 0 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-2); }
.g-weeks { position: relative; }
.g-wk { position: absolute; top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; border-right: 1px solid var(--border); }
.g-wk.cur { background: rgba(59,130,246,.08); }
.g-wk-l { font-size: 12px; font-weight: 700; }
.g-wk-s { font-size: 10px; color: var(--text-3); }
.g-today-hd, .g-today { position: absolute; top: 0; bottom: 0; width: 2px; background: #ef4444; z-index: 3; }
.g-row { display: flex; border-bottom: 1px solid var(--border); }
.g-left { position: sticky; left: 0; z-index: 5; width: 200px; min-width: 200px; background: var(--card); border-right: 1px solid var(--border); display: flex; align-items: center; gap: 10px; padding: 0 12px; }
.g-av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; }
.g-name { font-size: 13px; font-weight: 600; }
.g-meta { font-size: 11px; color: var(--text-3); }
.g-timeline { position: relative; overflow: hidden; }
.g-stripe { position: absolute; top: 0; bottom: 0; }
.g-stripe.even { background: rgba(0,0,0,.016); }
.g-stripe.cur { background: rgba(59,130,246,.045); }
.g-bar { position: absolute; border-radius: 5px; overflow: hidden; cursor: pointer; display: flex; align-items: center; z-index: 4; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
.p-urg { background: #ef4444; } .p-norm { background: #3b82f6; }
.g-bar-prog { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(0,0,0,.24); }
.g-bar-lbl { position: relative; z-index: 1; padding: 0 7px; font-size: 10.5px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 1px 2px rgba(0,0,0,.4); }
.g-conge { position: absolute; top: 0; bottom: 0; z-index: 2; background: repeating-linear-gradient(45deg,rgba(245,158,11,.16),rgba(245,158,11,.16) 6px,rgba(245,158,11,.3) 6px,rgba(245,158,11,.3) 12px); border-left: 2px dashed #d97706; border-right: 2px dashed #d97706; display: flex; justify-content: center; font-size: 11px; }
.g-masque { position: absolute; border-radius: 4px; z-index: 5; background: repeating-linear-gradient(45deg,rgba(255,255,255,.85),rgba(255,255,255,.85) 3px,rgba(148,163,184,.55) 3px,rgba(148,163,184,.55) 7px); box-shadow: 0 0 0 1px rgba(100,116,139,.5) inset; }
</style>
