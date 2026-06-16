<template>
  <div class="page-header">
    <h1>📁 Toutes les Demandes</h1>
    <button class="btn btn-secondary" @click="api.exportCsv()">📥 Exporter CSV</button>
  </div>
  <div class="page-content">
    <div class="filters">
      <input v-model="f.texte" class="form-control" placeholder="🔍 Rechercher…" style="flex:1;min-width:160px" />
      <select v-model="f.statut" class="form-control" style="width:180px">
        <option value="">Tous statuts</option>
        <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="f.priorite" class="form-control" style="width:140px">
        <option value="">Toutes priorités</option>
        <option value="normale">Normale</option><option value="urgente">⚡ Urgente</option>
      </select>
    </div>

    <div class="table-wrap">
      <div style="padding:8px 4px;color:var(--text-3);font-size:13px">{{ filtered.length }} demande(s)</div>
      <table>
        <thead><tr><th>Numéro</th><th>Priorité</th><th>Création</th><th>Objectif</th><th>Demandeur</th><th>Sujet</th><th>Statut</th><th>Assigné</th><th>Avanc.</th></tr></thead>
        <tbody>
          <tr v-if="filtered.length===0"><td colspan="9" class="empty-state">Aucune demande</td></tr>
          <tr v-for="d in filtered" :key="d.id" @click="selected=d" style="cursor:pointer">
            <td><strong>{{ d.numero }}</strong></td>
            <td><span class="badge" :class="d.priorite==='urgente'?'badge-urgente':'badge-normale'">{{ d.priorite==='urgente'?'⚡':'' }} {{ d.priorite }}</span></td>
            <td>{{ formatDate(d.date_creation) }}</td>
            <td :class="{ overdue: isOverdue(d.date_objectif, d.statut) }">{{ formatDate(d.date_objectif) }}</td>
            <td>{{ d.demandeur_nom }}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ d.outillage }}</td>
            <td><span class="badge" :class="statutClass(d.statut)">{{ d.statut }}</span></td>
            <td>{{ d.assigne_nom || '—' }}</td>
            <td style="min-width:90px"><ProgressBar :value="d.avancement" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <DemandeModal v-if="selected" :demande="selected" @close="selected=null" @refresh="load" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { formatDate, isOverdue, statutClass } from '../store.js'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'
import ProgressBar from '../components/ProgressBar.vue'
import DemandeModal from '../components/DemandeModal.vue'

const STATUTS = ['Nouvelle','En cours','En attente de validation','Clôturée','Abandonnée','Rejetée']
const rows = ref([]); const selected = ref(null)
const f = ref({ texte:'', statut:'', priorite:'' })
async function load(){ const r = await api.toutesDemandes(); if(r.ok) rows.value = r.data }
const filtered = computed(() => rows.value.filter(d => {
  if (f.value.texte && !((d.numero+d.outillage+(d.description||'')).toLowerCase().includes(f.value.texte.toLowerCase()))) return false
  if (f.value.statut && d.statut !== f.value.statut) return false
  if (f.value.priorite && d.priorite !== f.value.priorite) return false
  return true
}))
let stop
onMounted(() => { load(); stop = onEntities(['demande'], load) })
onUnmounted(() => stop && stop())
</script>
<style scoped>
.filters { display:flex; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
</style>
