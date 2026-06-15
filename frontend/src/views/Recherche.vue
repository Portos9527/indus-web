<template>
  <div class="page-header"><h1>🔍 Recherche</h1></div>
  <div class="page-content">
    <div class="filter-bar">
      <input v-model="f.texte" class="form-control search-input" placeholder="🔍 Rechercher…" @input="search" />
      <select v-model="f.statut" class="form-control" style="width:200px" @change="search">
        <option value="">Tous les statuts</option>
        <option v-for="s in STATUTS" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="f.priorite" class="form-control" style="width:140px" @change="search">
        <option value="">Toutes priorités</option>
        <option value="normale">Normale</option>
        <option value="urgente">⚡ Urgente</option>
      </select>
    </div>
    <div class="table-wrap">
      <div class="table-info">{{ rows.length }} résultat(s)</div>
      <table>
        <thead><tr><th>Numéro</th><th>Sujet</th><th>Demandeur</th><th>Assigné</th><th>Statut</th><th>Objectif</th></tr></thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id" @click="selected = d" style="cursor:pointer">
            <td><strong>{{ d.numero }}</strong></td>
            <td>{{ d.outillage }}</td>
            <td>{{ d.demandeur_nom }}</td>
            <td>{{ d.assigne_nom || '—' }}</td>
            <td><span class="badge" :class="statutClass(d.statut)">{{ d.statut }}</span></td>
            <td :class="{ overdue: isOverdue(d.date_objectif, d.statut) }">{{ formatDate(d.date_objectif) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <DemandeModal v-if="selected" :demande="selected" @close="selected=null" @refresh="search" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { formatDate, isOverdue, statutClass } from '../store.js'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'
import DemandeModal from '../components/DemandeModal.vue'

const STATUTS = ['Nouvelle','En cours','En attente de validation','Clôturée','Abandonnée','Rejetée']
const rows = ref([])
const selected = ref(null)
const f = ref({ texte: '', statut: '', priorite: '' })
let timer
async function search() {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    const filters = {}
    for (const k in f.value) if (f.value[k]) filters[k] = f.value[k]
    const r = await api.rechercher(filters)
    if (r.ok) rows.value = r.data
  }, 250)
}
let stop
onMounted(() => { search(); stop = onEntities(['demande'], search) })
onUnmounted(() => stop && stop())
</script>
