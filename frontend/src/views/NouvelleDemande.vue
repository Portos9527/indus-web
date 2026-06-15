<template>
  <div class="page-header"><h1>➕ Nouvelle Demande</h1></div>
  <div class="page-content">
    <div class="card" style="max-width:760px">
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Sujet / Outillage <span style="color:var(--red)">*</span></label>
          <input v-model="f.outillage" class="form-control" placeholder="Ex. Moule injection réf. M-204" />
        </div>
        <div class="form-group">
          <label class="form-label">Description <span style="color:var(--red)">*</span></label>
          <textarea v-model="f.description" class="form-control" rows="4" placeholder="Décrivez le besoin…"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Famille</label>
            <select v-model="f.famille" class="form-control" @change="f.categorie=''">
              <option value="">—</option>
              <option v-for="x in familles" :key="x.id" :value="x.valeur">{{ x.valeur }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Catégorie</label>
            <select v-model="f.categorie" class="form-control" :disabled="!f.famille">
              <option value="">—</option>
              <option v-for="c in cats" :key="c.id" :value="c.valeur">{{ c.valeur }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date objectif <span style="color:var(--red)">*</span></label>
            <input type="date" v-model="f.date_objectif" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Priorité</label>
            <div class="radio-group" style="margin-top:8px">
              <label class="radio-option"><input type="radio" v-model="f.priorite" value="normale" /> Normale</label>
              <label class="radio-option" style="color:var(--red)"><input type="radio" v-model="f.priorite" value="urgente" /> ⚡ Urgente</label>
            </div>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Budget estimé</label><input v-model="f.budget" class="form-control" /></div>
          <div class="form-group"><label class="form-label">Document de référence</label><input v-model="f.doc_reference" class="form-control" /></div>
        </div>
      </div>
      <div class="card-footer">
        <RouterLink to="/mes-demandes" class="btn btn-secondary">Annuler</RouterLink>
        <button class="btn btn-primary" :disabled="!valid || saving" @click="submit">{{ saving ? '…' : 'Soumettre' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { store, toastSuccess, toastError } from '../store.js'
import { api } from '../api.js'

const router = useRouter()
const familles = computed(() => store.familles)
const cats = computed(() => store.categories.filter(c => c.parent === f.value.famille))
const f = ref({ outillage: '', description: '', famille: '', categorie: '', date_objectif: '', priorite: 'normale', budget: '', doc_reference: '' })
const saving = ref(false)
const valid = computed(() => f.value.outillage && f.value.description && f.value.date_objectif)

async function submit() {
  saving.value = true
  const r = await api.creer(f.value)
  saving.value = false
  if (r.ok) { toastSuccess('Demande créée !'); router.push('/mes-demandes') }
  else toastError(r.error)
}
</script>
