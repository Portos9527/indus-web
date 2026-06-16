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
              <div class="g-bar" :class="prioClass(d.priorite)" :style="barStyle(d,lane)" :title="d.titre" @click="openDetail(d, tech)">
                <div class="g-bar-prog" :style="{ width: (d.avancement||0)+'%' }"></div>
                <span class="g-bar-lbl">{{ d.titre }}</span>
              </div>
              <div v-for="m in masquesFor(d.id)" :key="'m'+m.id" class="g-masque" :style="masqueStyle(m,lane)" :title="'Temps masqué '+m.motif"></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Fiche détail tâche -->
    <div v-if="detail" class="modal-overlay" @click.self="detail=null">
      <div class="pdc-detail" :style="{ '--accent': prioColor(detail.priorite) }">
        <div class="pdc-d-accent"></div>
        <div class="pdc-d-head">
          <div class="pdc-d-titlewrap">
            <span class="pdc-d-prio" :style="{ background: prioColor(detail.priorite) }">{{ prioLabel(detail.priorite) }}</span>
            <h2 class="pdc-d-title">{{ detail.titre }}</h2>
          </div>
          <button class="pdc-d-close" @click="detail=null" title="Fermer">✕</button>
        </div>

        <div class="pdc-d-body">
          <div v-if="detail._tech" class="pdc-d-tech">
            <span class="g-av" style="width:26px;height:26px;font-size:10px" :style="{ background: color(detail._tech.id) }">{{ ini(detail._tech.nom_affiche) }}</span>
            <span>{{ detail._tech.nom_affiche }}</span>
          </div>

          <div class="pdc-d-prog-row">
            <div class="pdc-d-prog"><div class="pdc-d-prog-fill" :style="{ width:(detail.avancement||0)+'%', background: prioColor(detail.priorite) }"></div></div>
            <span class="pdc-d-prog-val">{{ detail.avancement || 0 }}%</span>
          </div>

          <div class="pdc-d-grid">
            <div class="pdc-d-cell"><span class="lbl">Statut</span><span class="val">{{ detail.statut }}</span></div>
            <div class="pdc-d-cell"><span class="lbl">Délai</span><span class="val" :class="'ech-'+(ech?.cls||'ok')">{{ ech?.label || '—' }}</span></div>
            <div class="pdc-d-cell"><span class="lbl">Début</span><span class="val">{{ formatDate(detail.date_creation) }}</span></div>
            <div class="pdc-d-cell"><span class="lbl">Échéance</span><span class="val">{{ formatDate(detail.date_limite) }}</span></div>
          </div>

          <div class="pdc-d-section">
            <div class="pdc-d-sec-title">⏳ Temps masqué <span class="pdc-d-count">{{ masquesFor(detail.id).length }}</span></div>
            <div v-if="masquesFor(detail.id).length===0" class="pdc-d-empty">Aucune période d'attente</div>
            <div v-for="m in masquesFor(detail.id)" :key="m.id" class="pdc-d-masque">
              <span class="pdc-d-masque-dates">📅 {{ formatDate(m.date_debut) }} → {{ formatDate(m.date_fin) }}</span>
              <span class="pdc-d-masque-motif">{{ m.motif || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

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
function prioColor(p){ const x=(p||'').toLowerCase(); return x==='urgente'?'#ef4444':x==='haute'?'#f59e0b':x==='faible'?'#94a3b8':'#3b82f6' }
function prioLabel(p){ const x=(p||'normale').toLowerCase(); return x.charAt(0).toUpperCase()+x.slice(1) }
function openDetail(d, tech){ detail.value = { ...d, _tech: tech } }
const ech = computed(() => {
  const d = detail.value; if(!d?.date_limite) return null
  const lim = parseD(d.date_limite), t = parseD(todayStr)
  const days = Math.round((lim - t)/864e5)
  if(/clôtur|cloturé|terminé|abandon/i.test(d.statut||'')) return { label:'Terminée', cls:'ok' }
  if(days < 0)  return { label:`En retard de ${-days} j`, cls:'late' }
  if(days === 0) return { label:"Échéance aujourd'hui", cls:'warn' }
  return { label:`Dans ${days} j`, cls: days<=3 ? 'warn' : 'ok' }
})

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

/* ── Fiche détail tâche ── */
.pdc-detail { position: relative; width: 100%; max-width: 440px; background: var(--card,#fff); border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(15,23,42,.28); animation: pdc-pop .16s ease-out; }
@keyframes pdc-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }
.pdc-d-accent { height: 5px; background: var(--accent,#3b82f6); }
.pdc-d-head { display: flex; align-items: flex-start; gap: 10px; padding: 16px 18px 12px; }
.pdc-d-titlewrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.pdc-d-prio { align-self: flex-start; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #fff; padding: 3px 9px; border-radius: 999px; }
.pdc-d-title { font-size: 17px; font-weight: 800; margin: 0; line-height: 1.25; color: var(--text-1); word-break: break-word; }
.pdc-d-close { border: none; background: none; cursor: pointer; font-size: 16px; color: var(--text-3); padding: 4px 6px; border-radius: 7px; line-height: 1; }
.pdc-d-close:hover { background: var(--bg,#f1f5f9); color: var(--text-1); }
.pdc-d-body { padding: 0 18px 18px; display: flex; flex-direction: column; gap: 14px; }
.pdc-d-tech { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-2); }
.pdc-d-tech .g-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; flex-shrink: 0; }
.pdc-d-prog-row { display: flex; align-items: center; gap: 10px; }
.pdc-d-prog { flex: 1; height: 9px; border-radius: 999px; background: var(--bg,#eef2f7); overflow: hidden; }
.pdc-d-prog-fill { height: 100%; border-radius: 999px; transition: width .3s ease; }
.pdc-d-prog-val { font-size: 13px; font-weight: 800; color: var(--text-1); min-width: 38px; text-align: right; }
.pdc-d-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.pdc-d-cell { background: var(--card,#fff); padding: 9px 12px; display: flex; flex-direction: column; gap: 2px; }
.pdc-d-cell .lbl { font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; color: var(--text-3); font-weight: 700; }
.pdc-d-cell .val { font-size: 13.5px; font-weight: 600; color: var(--text-1); }
.val.ech-late { color: #dc2626; } .val.ech-warn { color: #d97706; } .val.ech-ok { color: #16a34a; }
.pdc-d-section { }
.pdc-d-sec-title { font-size: 12.5px; font-weight: 700; color: var(--text-2); display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.pdc-d-count { background: var(--bg,#eef2f7); color: var(--text-3); font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px; }
.pdc-d-empty { font-size: 12.5px; color: var(--text-3); font-style: italic; }
.pdc-d-masque { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 7px 10px; border-radius: 8px; background: var(--bg,#f8fafc); margin-bottom: 5px; }
.pdc-d-masque-dates { color: var(--text-1); font-weight: 600; }
.pdc-d-masque-motif { color: var(--text-3); }
</style>
