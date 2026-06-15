<template>
  <div class="page-header"><h1>📋 Mes Demandes</h1>
    <RouterLink to="/nouvelle" class="btn btn-primary">➕ Nouvelle demande</RouterLink>
  </div>
  <div class="page-content">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Numéro</th><th>Priorité</th><th>Création</th><th>Objectif</th><th>Sujet</th><th>Statut</th><th>Avancement</th></tr></thead>
        <tbody>
          <tr v-if="rows.length === 0"><td colspan="7" class="empty-state"><div class="icon">📋</div><p>Aucune demande</p></td></tr>
          <tr v-for="d in rows" :key="d.id" @click="selected = d" style="cursor:pointer">
            <td><strong>{{ d.numero }}</strong></td>
            <td><span class="badge" :class="d.priorite==='urgente'?'badge-urgente':'badge-normale'">{{ d.priorite==='urgente'?'⚡ Urgente':'Normale' }}</span></td>
            <td>{{ formatDate(d.date_creation) }}</td>
            <td :class="{ overdue: isOverdue(d.date_objectif, d.statut) }">{{ formatDate(d.date_objectif) }}</td>
            <td>{{ d.outillage }}</td>
            <td><span class="badge" :class="statutClass(d.statut)">{{ d.statut }}</span></td>
            <td style="min-width:110px"><ProgressBar :value="d.avancement" /></td>
          </tr>
        </tbody>
      </table>
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

const rows = ref([])
const selected = ref(null)
async function load() { const r = await api.mesDemandes(); if (r.ok) rows.value = r.data }
let stop
onMounted(() => { load(); stop = onEntities(['demande'], load) })
onUnmounted(() => stop && stop())
</script>
