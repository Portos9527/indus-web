<template>
  <div class="page-header">
    <h1>📈 Analyses <span class="live"><span class="dot"></span>EN DIRECT</span></h1>
    <span style="color:var(--text-3);font-size:13px">Maj {{ maj }}</span>
  </div>
  <div class="page-content" v-if="loaded">
    <!-- Score santé + KPIs -->
    <div class="stats-grid">
      <div class="stat-card" :class="'stat-'+health.cls"><div class="stat-value">{{ health.score }}</div><div class="stat-label">Santé du service</div></div>
      <div class="stat-card stat-blue"><div class="stat-value">{{ ouvertes.length }}</div><div class="stat-label">Demandes ouvertes</div></div>
      <div class="stat-card stat-red"><div class="stat-value">{{ retards }}</div><div class="stat-label">En retard</div></div>
      <div class="stat-card stat-orange"><div class="stat-value">{{ urgentes }}</div><div class="stat-label">Urgentes actives</div></div>
      <div class="stat-card stat-green"><div class="stat-value">{{ cloturees30 }}</div><div class="stat-label">Clôturées (30j)</div></div>
    </div>

    <!-- Insights automatiques -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>🔍 Analyses automatiques</h3></div>
      <div style="padding:8px 0">
        <div v-for="(ins,i) in insights" :key="i" class="insight" :class="ins.type">
          <span style="font-size:18px">{{ ins.icon }}</span>
          <div><strong>{{ ins.title }}</strong><div style="font-size:12px;color:var(--text-2)">{{ ins.text }}</div></div>
        </div>
      </div>
    </div>

    <!-- Charge par technicien -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>👤 Charge par technicien</h3></div>
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
        <div v-for="t in charge" :key="t.nom" style="display:flex;align-items:center;gap:10px">
          <span style="width:140px;font-size:13px">{{ t.nom }}</span>
          <div style="flex:1;height:14px;background:var(--bg-2,#f1f5f9);border-radius:99px;overflow:hidden">
            <div :style="{width:bar(t.n)+'%',height:'100%',background:t.n>=5?'#ef4444':'#3b82f6'}"></div>
          </div>
          <span style="width:26px;text-align:right;font-weight:700">{{ t.n }}</span>
        </div>
        <div v-if="charge.length===0" style="color:var(--text-3);font-size:13px">Aucune demande active assignée</div>
      </div>
    </div>
  </div>
  <div v-else class="page-content" style="text-align:center;padding:40px;color:var(--text-3)">⏳ Analyse…</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'

const rows = ref([]); const loaded = ref(false); const maj = ref('à l\'instant')
const today = new Date().toISOString().slice(0,10)
const d30 = new Date(Date.now()-30*864e5).toISOString().slice(0,10)
const TERM = ['Clôturée','Rejetée','Abandonnée']

async function load(){ const r = await api.toutesDemandes(); if(r.ok){ rows.value=r.data; loaded.value=true; maj.value='à l\'instant' } }
let stop, t
onMounted(()=>{ load(); stop=onEntities(['demande','conge','temps_masque'],load); t=setInterval(()=>maj.value='il y a <1 min',30000) })
onUnmounted(()=>{ stop&&stop(); clearInterval(t) })

const ouvertes = computed(()=>rows.value.filter(d=>!TERM.includes(d.statut)))
const retards = computed(()=>ouvertes.value.filter(d=>d.date_objectif&&d.date_objectif.slice(0,10)<today).length)
const urgentes = computed(()=>ouvertes.value.filter(d=>(d.priorite||'').toLowerCase()==='urgente').length)
const cloturees30 = computed(()=>rows.value.filter(d=>d.statut==='Clôturée'&&(d.date_cloture||'')>=d30).length)
const charge = computed(()=>{ const m={}; ouvertes.value.forEach(d=>{ if(d.assigne_nom) m[d.assigne_nom]=(m[d.assigne_nom]||0)+1 }); return Object.entries(m).map(([nom,n])=>({nom,n})).sort((a,b)=>b.n-a.n) })
const maxCharge = computed(()=>Math.max(1,...charge.value.map(t=>t.n)))
function bar(n){ return Math.round(n/maxCharge.value*100) }

const health = computed(()=>{ let s=100; s-=Math.min(40,retards.value*4); s-=urgentes.value*5; s=Math.max(0,Math.min(100,s))
  let cls='red',l='Critique'; if(s>=85){cls='green';l='Excellent'} else if(s>=70){cls='blue';l='Bon'} else if(s>=50){cls='orange';l='À surveiller'}
  return { score:s, cls, label:l } })

const insights = computed(()=>{ const o=[]
  if(urgentes.value>0&&ouvertes.value.some(d=>(d.priorite||'').toLowerCase()==='urgente'&&!d.assigne_nom)) o.push({type:'danger',icon:'🚨',title:'Urgentes non assignées',text:'Des demandes urgentes attendent une affectation.'})
  if(retards.value>0) o.push({type:'warn',icon:'⏰',title:retards.value+' demande(s) en retard',text:'Pensez à relancer les techniciens concernés.'})
  const top=charge.value[0]; if(top&&top.n>=5) o.push({type:'warn',icon:'🥵',title:top.nom+' en surcharge',text:top.n+' demandes actives — envisagez de redistribuer.'})
  if(o.length===0) o.push({type:'success',icon:'👍',title:'Tout est sous contrôle',text:'Aucun point d\'alerte détecté.'})
  return o })
</script>
<style scoped>
.live { font-size:11px;font-weight:800;color:#dc2626;background:#fef2f2;padding:3px 10px;border-radius:99px;vertical-align:middle;margin-left:8px }
.live .dot { display:inline-block;width:8px;height:8px;border-radius:50%;background:#dc2626;margin-right:5px;animation:p 1.4s infinite }
@keyframes p { 50%{opacity:.3} }
.insight { display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border) }
.insight.danger{border-left:3px solid #ef4444} .insight.warn{border-left:3px solid #f59e0b}
.insight.success{border-left:3px solid #10b981} .insight.info{border-left:3px solid #3b82f6}
</style>
