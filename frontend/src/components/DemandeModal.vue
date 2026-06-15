<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-wide">
      <div class="modal-header">
        <div>
          <span style="font-size:12px;color:var(--text-3);display:block">{{ d.numero }}</span>
          <h2>{{ d.outillage }}</h2>
        </div>
        <span class="badge" :class="statutClass(d.statut)" style="margin-left:8px">{{ d.statut }}</span>
        <div class="flex-1"></div>
        <button class="btn btn-ghost btn-sm" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="detail-cols">
          <!-- Infos -->
          <div>
            <div class="detail-field"><label>Description</label><p style="white-space:pre-wrap">{{ d.description }}</p></div>
            <div class="form-row">
              <div class="detail-field"><label>Demandeur</label><p>{{ d.demandeur_nom || '—' }}</p></div>
              <div class="detail-field"><label>Date création</label><p>{{ formatDate(d.date_creation) }}</p></div>
            </div>
            <div class="form-row">
              <div class="detail-field"><label>Date objectif</label>
                <p :class="{ overdue: isOverdue(d.date_objectif, d.statut) }">{{ formatDate(d.date_objectif) }}</p>
              </div>
              <div class="detail-field"><label>Famille / Catégorie</label><p>{{ d.famille || '—' }}<span v-if="d.categorie"> / {{ d.categorie }}</span></p></div>
            </div>
            <div class="form-row">
              <div class="detail-field"><label>Assigné à</label><p>{{ d.assigne_nom || 'Non assigné' }}</p></div>
              <div class="detail-field"><label>Priorité</label><p>{{ d.priorite }}</p></div>
            </div>
            <div class="detail-field"><label>Avancement</label><ProgressBar :value="d.avancement" /></div>

            <!-- Mise à jour avancement (technicien assigné) -->
            <div v-if="canUpdate" class="tm-section" style="border-color:#bfdbfe;background:var(--blue-l)">
              <div style="font-weight:700;color:var(--blue);margin-bottom:10px">🔧 Mettre à jour l'avancement</div>
              <input type="range" min="0" max="100" v-model.number="avancement" style="width:100%" />
              <div style="text-align:center;font-weight:700;margin:6px 0">{{ avancement }}%</div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-secondary btn-sm" @click="saveAvancement(false)">💾 Enregistrer</button>
                <button class="btn btn-success btn-sm" @click="saveAvancement(true)">✔️ Marquer terminé</button>
              </div>
            </div>

            <!-- Temps masqué -->
            <div class="tm-section">
              <div class="tm-head">⏳ Temps masqué <span class="tm-hint">(attente devis, infos…)</span></div>
              <div v-if="masques.length === 0" class="tm-empty">Aucune période d'attente déclarée</div>
              <div v-for="m in masques" :key="m.id" class="tm-item">
                <span class="tm-bar"></span>
                <div style="flex:1"><div class="tm-dates">{{ formatDate(m.date_debut) }} → {{ formatDate(m.date_fin) }}</div><div class="tm-motif">{{ m.motif }}</div></div>
                <button v-if="canDeclare" class="tm-del" @click="delMasque(m.id)">🗑️</button>
              </div>
              <div v-if="canDeclare" class="tm-form">
                <div class="tm-row">
                  <input type="date" v-model="mf.date_debut" class="form-control" />
                  <span>→</span>
                  <input type="date" v-model="mf.date_fin" class="form-control" />
                </div>
                <div class="tm-row">
                  <select v-model="mf.motif" class="form-control"><option v-for="x in TM_MOTIFS" :key="x">{{ x }}</option></select>
                  <button class="btn btn-secondary btn-sm" :disabled="!mfValid" @click="addMasque">➕</button>
                </div>
              </div>
            </div>

            <!-- Évaluation (demandeur) -->
            <div v-if="canEvaluer" class="tm-section" style="border-color:#fcd34d;background:#fffbeb">
              <div style="font-weight:700;margin-bottom:10px">⭐ Évaluer la prestation</div>
              <div class="form-row-3">
                <div><label class="form-label">Qualité</label><input type="number" min="1" max="5" v-model.number="ev.qualite" class="form-control" /></div>
                <div><label class="form-label">Coût</label><input type="number" min="1" max="5" v-model.number="ev.cout" class="form-control" /></div>
                <div><label class="form-label">Délais</label><input type="number" min="1" max="5" v-model.number="ev.delais" class="form-control" /></div>
              </div>
              <button class="btn btn-success btn-sm" style="margin-top:8px" :disabled="!ev.qualite||!ev.cout||!ev.delais" @click="evaluer">✅ Valider l'évaluation</button>
            </div>
          </div>

          <!-- Commentaires -->
          <div>
            <div style="font-weight:700;margin-bottom:12px">💬 Commentaires</div>
            <div class="comment-thread">
              <div v-if="comments.length === 0" style="color:var(--text-3);font-size:12px">Aucun commentaire</div>
              <div v-for="c in comments" :key="c.id" class="comment-item">
                <div class="comment-avatar" :style="{ background: avatarColor(c.auteur_id) }">{{ c.auteur_initiales || '?' }}</div>
                <div class="comment-body">
                  <div class="comment-meta"><strong>{{ c.auteur_nom }}</strong> · {{ formatDateTime(c.date) }}</div>
                  <div class="comment-text">{{ c.texte }}</div>
                </div>
              </div>
            </div>
            <div class="form-group">
              <textarea v-model="newComment" class="form-control" placeholder="Ajouter un commentaire…" rows="3"></textarea>
            </div>
            <button class="btn btn-secondary btn-sm" :disabled="!newComment.trim()" @click="postComment">Envoyer</button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button v-if="canAbandonner" class="btn btn-danger" @click="abandonner">🚫 Abandonner</button>
        <button class="btn btn-secondary" @click="$emit('close')">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store, formatDate, formatDateTime, isOverdue, statutClass, avatarColor, toastSuccess, toastError } from '../store.js'
import { api } from '../api.js'
import ProgressBar from './ProgressBar.vue'

const props = defineProps({ demande: Object })
const emit = defineEmits(['close', 'refresh'])
const d = computed(() => props.demande)
const user = computed(() => store.user)

const comments = ref([])
const newComment = ref('')
const masques = ref([])
const avancement = ref(props.demande.avancement || 0)
const ev = ref({ qualite: 0, cout: 0, delais: 0 })

const TM_MOTIFS = ['Attente devis', 'Attente infos', 'Attente pièces', 'Validation client', 'Autre']
const mf = ref({ date_debut: '', date_fin: '', motif: 'Attente devis' })
const mfValid = computed(() => mf.value.date_debut && mf.value.date_fin && mf.value.date_fin >= mf.value.date_debut)

const canUpdate = computed(() => user.value && d.value.assigne_a === user.value.id && d.value.statut === 'En cours')
const canDeclare = computed(() => user.value && (user.value.role >= 2 || d.value.assigne_a === user.value.id))
const canEvaluer = computed(() => d.value.statut === 'En attente de validation' && d.value.demandeur_id === user.value?.id && d.value.satisfaction_validee === 0)
const canAbandonner = computed(() => d.value.statut === 'En cours' && user.value?.role >= 2)

onMounted(async () => {
  const [c, m] = await Promise.all([api.commentaires(d.value.id), api.tempsMasque(d.value.id)])
  if (c.ok) comments.value = c.data
  if (m.ok) masques.value = m.data
})

async function postComment() {
  const r = await api.ajoutComment(d.value.id, newComment.value)
  if (r.ok) { comments.value.push(r.data); newComment.value = '' } else toastError(r.error)
}
async function saveAvancement(termine) {
  const r = await api.avancement(d.value.id, { avancement: avancement.value, travail_termine: termine })
  if (r.ok) { toastSuccess(termine ? 'Travail marqué terminé' : 'Avancement enregistré'); emit('refresh'); emit('close') }
  else toastError(r.error)
}
async function addMasque() {
  const r = await api.ajoutMasque({ demande_id: d.value.id, ...mf.value })
  if (r.ok) { masques.value.push(r.data); mf.value = { date_debut: '', date_fin: '', motif: 'Attente devis' }; toastSuccess('Déclaré') }
  else toastError(r.error)
}
async function delMasque(id) {
  const r = await api.supprMasque(id)
  if (r.ok) masques.value = masques.value.filter(m => m.id !== id)
}
async function evaluer() {
  const r = await api.evaluer(d.value.id, ev.value)
  if (r.ok) { toastSuccess('Évaluation enregistrée — demande clôturée'); emit('refresh'); emit('close') }
  else toastError(r.error)
}
async function abandonner() {
  if (!confirm('Abandonner cette demande ?')) return
  const r = await api.abandonner(d.value.id)
  if (r.ok) { toastSuccess('Demande abandonnée'); emit('refresh'); emit('close') }
  else toastError(r.error)
}
</script>

<style scoped>
.tm-section { margin: 16px 0; padding: 14px; border: 1px solid #fed7aa; border-radius: 12px; background: #fff7ed; }
.tm-head { font-size: 13px; font-weight: 700; color: #c2410c; margin-bottom: 10px; }
.tm-hint { font-weight: 400; font-size: 11px; color: var(--text-3); }
.tm-empty { font-size: 12px; color: var(--text-3); font-style: italic; }
.tm-item { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px dashed #fed7aa; }
.tm-bar { width: 22px; height: 14px; border-radius: 3px; background: repeating-linear-gradient(45deg,#fdba74,#fdba74 3px,#fb923c 3px,#fb923c 6px); }
.tm-dates { font-size: 12.5px; font-weight: 600; }
.tm-motif { font-size: 11px; color: #c2410c; }
.tm-del { background: none; border: none; cursor: pointer; }
.tm-form { margin-top: 10px; padding-top: 10px; border-top: 1px solid #fed7aa; display: flex; flex-direction: column; gap: 8px; }
.tm-row { display: flex; align-items: center; gap: 8px; }
.tm-row .form-control { flex: 1; }
.form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
</style>
