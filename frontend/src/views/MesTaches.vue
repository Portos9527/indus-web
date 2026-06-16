<template>
  <div class="page-header"><h1>🔧 Mes Tâches</h1></div>
  <div class="page-content">
    <!-- KPIs (ex-Mon Dashboard) -->
    <div class="stats-grid" v-if="stats">
      <div class="stat-card stat-blue"><div class="stat-value">{{ stats.en_cours }}</div><div class="stat-label">En cours</div><div class="stat-icon">🔧</div></div>
      <div class="stat-card stat-green"><div class="stat-value">{{ stats.cloturees_mois }}</div><div class="stat-label">Clôturées (30j)</div><div class="stat-icon">✅</div></div>
      <div class="stat-card stat-red"><div class="stat-value">{{ stats.en_retard }}</div><div class="stat-label">En retard</div><div class="stat-icon">⚠️</div></div>
      <div class="stat-card stat-orange"><div class="stat-value">{{ rows.length }}</div><div class="stat-label">Tâches actives</div><div class="stat-icon">📋</div></div>
    </div>

    <!-- Liste des tâches -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>📋 Tâches qui me sont assignées</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Numéro</th><th>Priorité</th><th>Sujet</th><th>Objectif</th><th>Statut</th><th>Avancement</th></tr></thead>
          <tbody>
            <tr v-if="rows.length===0"><td colspan="6" class="empty-state"><div class="icon">✅</div><p>Aucune tâche active</p></td></tr>
            <tr v-for="d in rows" :key="d.id" @click="selected=d" style="cursor:pointer">
              <td><strong>{{ d.numero }}</strong></td>
              <td><span class="badge" :class="d.priorite==='urgente'?'badge-urgente':'badge-normale'">{{ d.priorite==='urgente'?'⚡':'' }} {{ d.priorite }}</span></td>
              <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ d.outillage }}</td>
              <td :class="{ overdue: isOverdue(d.date_objectif, d.statut) }">{{ formatDate(d.date_objectif) }}</td>
              <td><span class="badge" :class="statutClass(d.statut)">{{ d.statut }}</span></td>
              <td style="min-width:120px"><ProgressBar :value="d.avancement" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <DemandeModal v-if="selected" :demande="selected" @close="selected=null" @refresh="load" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { formatDate, isOverdue, statutClass } from '../store.js'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'
import ProgressBar from '../components/ProgressBar.vue'
import DemandeModal from '../components/DemandeModal.vue'

const stats = ref(null)
const rows = ref([])
const selected = ref(null)
async function load() {
  const [s, t] = await Promise.all([api.dashboardTech(), api.mesTaches()])
  if (s.ok) stats.value = s.data
  if (t.ok) rows.value = t.data
}
let stop
onMounted(() => { load(); stop = onEntities(['demande'], load) })
onUnmounted(() => stop && stop())
</script>
