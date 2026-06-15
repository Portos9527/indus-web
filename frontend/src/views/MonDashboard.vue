<template>
  <div class="page-header"><h1>📊 Mon Dashboard</h1></div>
  <div class="page-content">
    <div class="stats-grid" v-if="stats">
      <div class="stat-card stat-blue"><div class="stat-value">{{ stats.en_cours }}</div><div class="stat-label">En cours</div><div class="stat-icon">🔧</div></div>
      <div class="stat-card stat-green"><div class="stat-value">{{ stats.cloturees_mois }}</div><div class="stat-label">Clôturées (30j)</div><div class="stat-icon">✅</div></div>
      <div class="stat-card stat-red"><div class="stat-value">{{ stats.en_retard }}</div><div class="stat-label">En retard</div><div class="stat-icon">⚠️</div></div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><h3>🔧 Mes tâches actives</h3></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Numéro</th><th>Sujet</th><th>Objectif</th><th>Statut</th><th>Avancement</th></tr></thead>
          <tbody>
            <tr v-if="taches.length===0"><td colspan="5" class="empty-state">Aucune tâche active</td></tr>
            <tr v-for="d in taches" :key="d.id" @click="selected=d" style="cursor:pointer">
              <td><strong>{{ d.numero }}</strong></td>
              <td>{{ d.outillage }}</td>
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
const taches = ref([])
const selected = ref(null)
async function load() {
  const [s, t] = await Promise.all([api.dashboardTech(), api.mesTaches()])
  if (s.ok) stats.value = s.data
  if (t.ok) taches.value = t.data
}
let stop
onMounted(() => { load(); stop = onEntities(['demande'], load) })
onUnmounted(() => stop && stop())
</script>
