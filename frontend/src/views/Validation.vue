<template>
  <div class="page-header"><h1>✅ Validation des Demandes</h1><span style="color:var(--text-2);font-size:14px">{{ rows.length }} en attente</span></div>
  <div class="page-content">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Numéro</th><th>Priorité</th><th>Demandeur</th><th>Sujet</th><th>Objectif</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-if="rows.length === 0"><td colspan="6" class="empty-state"><div class="icon">✅</div><p>Aucune demande à valider</p></td></tr>
          <tr v-for="d in rows" :key="d.id">
            <td><strong>{{ d.numero }}</strong></td>
            <td><span class="badge" :class="d.priorite==='urgente'?'badge-urgente':'badge-normale'">{{ d.priorite }}</span></td>
            <td>{{ d.demandeur_nom }}</td>
            <td>{{ d.outillage }}</td>
            <td>{{ formatDate(d.date_objectif) }}</td>
            <td><div style="display:flex;gap:6px">
              <button class="btn btn-success btn-sm" @click="openValider(d)">✅ Valider</button>
              <button class="btn btn-danger btn-sm" @click="openRejeter(d)">❌ Rejeter</button>
            </div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal validation -->
    <div v-if="valModal" class="modal-overlay" @click.self="valModal=null">
      <div class="modal">
        <div class="modal-header"><h2>✅ Valider — {{ valModal.numero }}</h2><button class="btn btn-ghost btn-sm" @click="valModal=null">✕</button></div>
        <div class="modal-body">
          <div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:16px"><strong>{{ valModal.outillage }}</strong></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Famille *</label>
              <select v-model="vf.famille" class="form-control" @change="vf.categorie=''"><option value="">—</option><option v-for="x in familles" :key="x.id" :value="x.valeur">{{ x.valeur }}</option></select>
            </div>
            <div class="form-group"><label class="form-label">Catégorie *</label>
              <select v-model="vf.categorie" class="form-control" :disabled="!vf.famille"><option value="">—</option><option v-for="c in vfCats" :key="c.id" :value="c.valeur">{{ c.valeur }}</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Assigner à *</label>
              <select v-model.number="vf.assigne_a" class="form-control"><option :value="null">—</option><option v-for="t in techniciens" :key="t.id" :value="t.id">{{ t.nom_affiche }}</option></select>
            </div>
            <div class="form-group"><label class="form-label">Durée estimée (j) *</label><input type="number" min="1" v-model.number="vf.duree_estimee" class="form-control" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Priorité</label>
              <div class="radio-group" style="margin-top:8px">
                <label class="radio-option"><input type="radio" v-model="vf.priorite" value="normale" /> Normale</label>
                <label class="radio-option" style="color:var(--red)"><input type="radio" v-model="vf.priorite" value="urgente" /> ⚡ Urgente</label>
              </div>
            </div>
            <div class="form-group"><label class="form-label">Date objectif</label><input type="date" v-model="vf.date_objectif" class="form-control" /></div>
          </div>

          <!-- Aperçu charge du technicien -->
          <div v-if="vf.assigne_a" class="assign-load" :class="{ warn: selTechConges.length }">
            <div class="al-head"><span>📊 Charge de <strong>{{ selTechName }}</strong></span>
              <span class="al-count">{{ selTechDemandes.length }} active(s)<span v-if="selTechRetard" style="color:#dc2626;font-weight:700"> · {{ selTechRetard }} en retard</span></span>
            </div>
            <div v-if="selTechConges.length" class="al-conge">🏖️ Absent : <span v-for="c in selTechConges" :key="c.id">{{ formatDate(c.date_debut) }} → {{ formatDate(c.date_fin) }} ({{ c.motif }})</span></div>
            <div v-for="dd in selTechDemandes.slice(0,5)" :key="dd.id" class="al-item">
              <span class="al-title">{{ dd.titre }}</span>
              <span class="al-date" :class="{ overdue: dd.date_limite && dd.date_limite.slice(0,10) < todayStr }">{{ dd.date_limite ? formatDate(dd.date_limite) : '—' }}</span>
            </div>
            <div v-if="selTechDemandes.length===0" style="color:#16a34a;font-size:12px;font-weight:600">✅ Pleinement disponible</div>
          </div>

          <div class="form-group"><label class="form-label">Commentaire</label><textarea v-model="vf.commentaire" class="form-control" rows="2"></textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="valModal=null">Annuler</button>
          <button class="btn btn-success" :disabled="!valValid || saving" @click="confirmer">{{ saving?'…':'✅ Valider' }}</button>
        </div>
      </div>
    </div>

    <!-- Popup congés -->
    <div v-if="congesConfirm" class="modal-overlay" style="z-index:1100" @click.self="congesConfirm=null">
      <div class="modal" style="max-width:460px">
        <div class="modal-header" style="background:#fffbeb"><h2>🏖️ Technicien en congés</h2><button class="btn btn-ghost btn-sm" @click="congesConfirm=null">✕</button></div>
        <div class="modal-body">
          <p style="margin-top:0"><strong>{{ congesConfirm.techNom }}</strong> est en congés pendant la période :</p>
          <div v-for="c in congesConfirm.conges" :key="c.id" class="conge-line">📅 <strong>{{ formatDate(c.date_debut) }} → {{ formatDate(c.date_fin) }}</strong> <span style="margin-left:auto;background:#fde68a;padding:2px 8px;border-radius:99px;font-size:11px">{{ c.motif }}</span></div>
          <p style="color:var(--text-2)">Valider et lui assigner quand même ?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="congesConfirm=null">Annuler</button>
          <button class="btn btn-warning" :disabled="saving" @click="proceed">Assigner malgré les congés</button>
        </div>
      </div>
    </div>

    <!-- Modal rejet -->
    <div v-if="rejModal" class="modal-overlay" @click.self="rejModal=null">
      <div class="modal">
        <div class="modal-header"><h2>❌ Rejeter — {{ rejModal.numero }}</h2><button class="btn btn-ghost btn-sm" @click="rejModal=null">✕</button></div>
        <div class="modal-body"><div class="form-group"><label class="form-label">Motif *</label><textarea v-model="motif" class="form-control" rows="3"></textarea></div></div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="rejModal=null">Annuler</button><button class="btn btn-danger" :disabled="!motif.trim()||saving" @click="confirmerRejet">❌ Confirmer</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store, formatDate, toastSuccess, toastError } from '../store.js'
import { api } from '../api.js'
import { onEntities } from '../realtime.js'

const rows = ref([])
const techniciens = ref([])
const planData = ref([])
const congesAll = ref([])
const valModal = ref(null)
const rejModal = ref(null)
const congesConfirm = ref(null)
const saving = ref(false)
const motif = ref('')
const todayStr = new Date().toISOString().slice(0, 10)
const familles = computed(() => store.familles)
const vf = ref({ famille:'', categorie:'', assigne_a:null, duree_estimee:null, priorite:'normale', date_objectif:'', commentaire:'' })
const vfCats = computed(() => store.categories.filter(c => c.parent === vf.value.famille))
const valValid = computed(() => vf.value.famille && vf.value.categorie && vf.value.assigne_a && vf.value.duree_estimee && vf.value.date_objectif)

const selTech = computed(() => planData.value.find(t => t.id === vf.value.assigne_a))
const selTechDemandes = computed(() => selTech.value?.demandes || [])
const selTechName = computed(() => techniciens.value.find(t => t.id === vf.value.assigne_a)?.nom_affiche || '')
const selTechRetard = computed(() => selTechDemandes.value.filter(d => d.date_limite && d.date_limite.slice(0,10) < todayStr).length)
const selTechConges = computed(() => {
  if (!vf.value.assigne_a || !vf.value.date_objectif) return []
  return congesAll.value.filter(c => c.technicien_id === vf.value.assigne_a && c.date_debut <= vf.value.date_objectif && c.date_fin >= todayStr)
})

async function load() {
  const r = await api.aValider(); if (r.ok) { rows.value = r.data; store.badges.validation = r.data.length }
}
onMounted(async () => {
  const [t, p, c] = await Promise.all([api.techniciens(), api.planDeCharge(), api.conges()])
  if (t.ok) techniciens.value = t.data
  if (p.ok) planData.value = p.data
  if (c.ok) congesAll.value = c.data
  await load()
  stop = onEntities(['demande', 'conge'], async () => {
    await load()
    const p2 = await api.planDeCharge(); if (p2.ok) planData.value = p2.data
    const c2 = await api.conges(); if (c2.ok) congesAll.value = c2.data
  })
})
let stop
onUnmounted(() => stop && stop())

function openValider(d) { vf.value = { famille:d.famille||'', categorie:d.categorie||'', assigne_a:null, duree_estimee:null, priorite:d.priorite, date_objectif:(d.date_objectif||'').slice(0,10), commentaire:'' }; valModal.value = d }
function openRejeter(d) { motif.value=''; rejModal.value = d }

async function confirmer() {
  if (vf.value.assigne_a && vf.value.date_objectif) {
    const chk = await api.congesCheck({ technicien_id: vf.value.assigne_a, date_debut: todayStr, date_fin: vf.value.date_objectif })
    if (chk.ok && chk.data.length) { congesConfirm.value = { techNom: selTechName.value, conges: chk.data }; return }
  }
  await doValider()
}
async function proceed() { congesConfirm.value = null; await doValider() }
async function doValider() {
  saving.value = true
  const r = await api.valider(valModal.value.id, vf.value)
  saving.value = false
  if (r.ok) { toastSuccess('Demande validée et assignée !'); valModal.value=null; await load(); const p = await api.planDeCharge(); if (p.ok) planData.value = p.data }
  else toastError(r.error)
}
async function confirmerRejet() {
  saving.value = true
  const r = await api.rejeter(rejModal.value.id, motif.value)
  saving.value = false
  if (r.ok) { toastSuccess('Demande rejetée'); rejModal.value=null; await load() } else toastError(r.error)
}
</script>

<style scoped>
.assign-load { margin: 4px 0 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-2,#f8fafc); padding: 12px 14px; }
.assign-load.warn { border-color: #fcd34d; background: #fffbeb; }
.al-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
.al-count { font-size: 12px; color: var(--text-3); }
.al-conge { font-size: 12px; color: #92400e; background: #fef3c7; border-radius: 7px; padding: 7px 10px; margin-bottom: 8px; }
.al-item { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
.al-title { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-date.overdue { color: #dc2626; font-weight: 700; }
.conge-line { display: flex; align-items: center; gap: 8px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 7px; padding: 8px 12px; margin: 8px 0; font-size: 13px; color: #92400e; }
</style>
