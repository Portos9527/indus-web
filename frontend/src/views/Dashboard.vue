<template>
  <div class="page-header"><h1>📊 Tableau de Bord Global</h1>
    <select v-model.number="mois" class="form-control" style="width:140px" @change="load">
      <option :value="1">1 mois</option><option :value="3">3 mois</option><option :value="6">6 mois</option><option :value="12">12 mois</option>
    </select>
  </div>
  <div class="page-content" v-if="s">
    <div class="kpi-grid">
      <div class="kpi b"><div class="v">{{ s.ouvertes }}</div><div class="l">Ouvertes</div></div>
      <div class="kpi a"><div class="v">{{ s.nouvelles }}</div><div class="l">À valider</div></div>
      <div class="kpi r"><div class="v">{{ s.en_retard }}</div><div class="l">En retard</div></div>
      <div class="kpi p"><div class="v">{{ s.urgentes }}</div><div class="l">Urgentes</div></div>
      <div class="kpi g"><div class="v">{{ s.cloturees_periode }}</div><div class="l">Clôturées</div></div>
      <div class="kpi t"><div class="v">{{ s.taux_respect }}%</div><div class="l">Respect délais</div></div>
    </div>

    <div class="charts">
      <div class="card"><div class="card-header"><h3>Répartition par statut</h3></div><div class="card-body" style="height:260px"><canvas ref="cStatut"></canvas></div></div>
      <div class="card"><div class="card-header"><h3>Charge par technicien</h3></div><div class="card-body" style="height:260px"><canvas ref="cTech"></canvas></div></div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>🚨 Urgentes en retard</h3></div>
      <div class="card-body" style="padding:0">
        <table>
          <thead><tr><th>Numéro</th><th>Sujet</th><th>Assigné</th><th>Retard</th></tr></thead>
          <tbody>
            <tr v-if="s.urgentes_retard.length===0"><td colspan="4" style="text-align:center;padding:20px;color:var(--text-3)">✅ Aucune</td></tr>
            <tr v-for="d in s.urgentes_retard" :key="d.id"><td><strong>{{ d.numero }}</strong></td><td>{{ d.outillage }}</td><td>{{ d.assigne_nom || '—' }}</td><td><span class="badge badge-rejetee">{{ d.retard_jours }} j</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-header"><h3>🏆 Performances techniciens</h3></div>
      <div class="card-body" style="padding:0">
        <table>
          <thead><tr><th>Technicien</th><th>Clôturées</th><th>Durée moy.</th><th>Qualité</th></tr></thead>
          <tbody>
            <tr v-for="p in s.perf_techniciens" :key="p.nom"><td><strong>{{ p.nom }}</strong></td><td>{{ p.cloturees }}</td><td>{{ p.duree_moy ? Math.round(p.duree_moy)+' j' : '—' }}</td><td>{{ stars(p.sat_qualite) }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div v-else class="page-content" style="text-align:center;padding:60px;color:var(--text-3)">⏳ Chargement…</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'
import Chart from 'chart.js/auto'

const s = ref(null), mois = ref(3)
const cStatut = ref(null), cTech = ref(null)
let i1, i2
const STAT_COLORS = { 'Nouvelle':'#3B82F6','En cours':'#F59E0B','En attente de validation':'#D97706','Clôturée':'#10B981','Abandonnée':'#6B7280','Rejetée':'#EF4444' }

async function load() {
  const r = await api.dashboard(mois.value)
  if (r.ok) { s.value = r.data; await nextTick(); draw() }
}
function draw() {
  if (i1) i1.destroy(); if (i2) i2.destroy()
  if (cStatut.value) i1 = new Chart(cStatut.value, { type:'doughnut', data:{ labels:s.value.par_statut.map(x=>x.statut), datasets:[{ data:s.value.par_statut.map(x=>x.count), backgroundColor:s.value.par_statut.map(x=>STAT_COLORS[x.statut]||'#94A3B8') }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} } })
  if (cTech.value) i2 = new Chart(cTech.value, { type:'bar', data:{ labels:s.value.charge_techniciens.map(t=>t.initiales||t.nom.split(' ')[0]), datasets:[{ label:'Demandes', data:s.value.charge_techniciens.map(t=>t.count), backgroundColor:'#3B82F6', borderRadius:6 }] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{beginAtZero:true,ticks:{stepSize:1}}} } })
}
function stars(v){ if(!v) return '—'; return '★'.repeat(Math.round(v))+' '+v.toFixed(1) }
let stop
onMounted(() => { load(); stop = onEntities(['demande'], load) })
onUnmounted(() => { stop && stop(); if (i1) i1.destroy(); if (i2) i2.destroy() })
</script>

<style scoped>
.kpi-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 16px; }
.kpi { border-radius: 14px; padding: 16px; color: #fff; }
.kpi .v { font-size: 30px; font-weight: 800; }
.kpi .l { font-size: 11px; font-weight: 600; opacity: .92; margin-top: 4px; }
.kpi.b { background: linear-gradient(135deg,#3b82f6,#2563eb); }
.kpi.a { background: linear-gradient(135deg,#f59e0b,#d97706); }
.kpi.r { background: linear-gradient(135deg,#ef4444,#dc2626); }
.kpi.p { background: linear-gradient(135deg,#8b5cf6,#7c3aed); }
.kpi.g { background: linear-gradient(135deg,#10b981,#059669); }
.kpi.t { background: linear-gradient(135deg,#14b8a6,#0d9488); }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 1000px) { .kpi-grid { grid-template-columns: repeat(3,1fr); } .charts { grid-template-columns: 1fr; } }
</style>
