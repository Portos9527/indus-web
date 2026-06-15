<template>
  <div class="page-header"><h1>⚙️ Administration</h1></div>
  <div class="page-content">
    <div class="tab-bar">
      <button v-for="t in TABS" :key="t.id" class="tab-btn" :class="{ active: tab===t.id }" @click="tab=t.id">{{ t.label }}</button>
    </div>

    <!-- Utilisateurs -->
    <div v-show="tab==='users'">
      <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" @click="openCreate">➕ Nouvel utilisateur</button></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Login</th><th>Rôle</th><th>Email</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td><strong>{{ u.nom_affiche }}</strong></td>
              <td style="color:var(--text-3)">{{ u.nom_session }}</td>
              <td><span class="badge" :class="roleClass(u.role)">{{ ROLE_LABEL[u.role] }}</span></td>
              <td>{{ u.email || '—' }}</td>
              <td><span class="badge" :class="u.actif?'badge-cloturee':'badge-rejetee'">{{ u.actif?'✅ Actif':'🔴 Inactif' }}</span></td>
              <td><div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" @click="openEdit(u)">✏️</button>
                <button class="btn btn-ghost btn-sm" @click="resetPwd(u)">🔑</button>
                <button class="btn btn-ghost btn-sm" :disabled="u.id===store.user.id" @click="toggle(u)">{{ u.actif?'🔴':'✅' }}</button>
              </div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Config -->
    <div v-show="tab==='config'">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="card"><div class="card-header"><h3>Familles</h3></div><div class="card-body">
          <div v-for="f in familles" :key="f.id" class="cfg-row"><span style="flex:1">{{ f.valeur }}</span><button class="btn btn-ghost btn-sm" @click="delFamille(f)">✕</button></div>
          <div style="display:flex;gap:8px;margin-top:12px"><input v-model="newFam" class="form-control" placeholder="Nouvelle famille…" @keyup.enter="addFamille" /><button class="btn btn-primary btn-sm" @click="addFamille">➕</button></div>
        </div></div>
        <div class="card"><div class="card-header"><h3>Catégories</h3></div><div class="card-body">
          <select v-model="selFam" class="form-control" style="margin-bottom:10px"><option value="">— Famille —</option><option v-for="f in familles" :key="f.id" :value="f.valeur">{{ f.valeur }}</option></select>
          <div v-for="c in catsFiltered" :key="c.id" class="cfg-row"><span style="flex:1">{{ c.valeur }}</span><button class="btn btn-ghost btn-sm" @click="delCat(c)">✕</button></div>
          <div v-if="selFam" style="display:flex;gap:8px;margin-top:12px"><input v-model="newCat" class="form-control" placeholder="Nouvelle catégorie…" @keyup.enter="addCat" /><button class="btn btn-primary btn-sm" @click="addCat">➕</button></div>
        </div></div>
      </div>
    </div>

    <!-- Modal user -->
    <div v-if="userModal" class="modal-overlay" @click.self="userModal=null">
      <div class="modal">
        <div class="modal-header"><h2>{{ uf.id ? '✏️ Modifier' : '➕ Nouvel utilisateur' }}</h2><button class="btn btn-ghost btn-sm" @click="userModal=null">✕</button></div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Nom affiché *</label><input v-model="uf.nom_affiche" class="form-control" /></div>
            <div class="form-group"><label class="form-label">Login *</label><input v-model="uf.nom_session" class="form-control" :disabled="!!uf.id" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Rôle</label><select v-model.number="uf.role" class="form-control"><option v-for="(l,i) in ROLE_LABEL" :key="i" :value="i">{{ l }}</option></select></div>
            <div class="form-group"><label class="form-label">Email</label><input v-model="uf.email" class="form-control" type="email" /></div>
          </div>
          <div v-if="!uf.id" class="form-group"><label class="form-label">Mot de passe *</label><input v-model="uf.password" type="password" class="form-control" /></div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="userModal=null">Annuler</button><button class="btn btn-primary" @click="saveUser">💾 Enregistrer</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { store, ROLE_LABEL, toastSuccess, toastError } from '../store.js'
import { api } from '../api.js'

const TABS = [{ id:'users', label:'👥 Utilisateurs' }, { id:'config', label:'🏷️ Familles & Catégories' }]
const tab = ref('users')
const users = ref([])
const familles = ref([]), categories = ref([])
const selFam = ref(''), newFam = ref(''), newCat = ref('')
const userModal = ref(null)
const uf = ref({})

const catsFiltered = computed(() => selFam.value ? categories.value.filter(c => c.parent === selFam.value) : categories.value)
function roleClass(r){ return ['badge-normale','badge-en-cours','badge-attente','badge-urgente'][r] || 'badge-normale' }

async function loadUsers(){ const r = await api.users(); if(r.ok) users.value = r.data }
async function loadConfig(){ const [f,c]=await Promise.all([api.familles(),api.categories()]); if(f.ok)familles.value=f.data; if(c.ok)categories.value=c.data }
onMounted(() => { loadUsers(); loadConfig() })

function openCreate(){ uf.value = { nom_affiche:'', nom_session:'', role:0, email:'', password:'' }; userModal.value = true }
function openEdit(u){ uf.value = { id:u.id, nom_affiche:u.nom_affiche, nom_session:u.nom_session, initiales:u.initiales, role:u.role, email:u.email, actif:u.actif }; userModal.value = true }
async function saveUser(){
  const r = uf.value.id ? await api.modifierUser(uf.value.id, uf.value) : await api.creerUser(uf.value)
  if(r.ok){ toastSuccess('Enregistré'); userModal.value=null; await loadUsers() } else toastError(r.error)
}
async function toggle(u){ const r=await api.toggleUser(u.id); if(r.ok) await loadUsers(); else toastError(r.error) }
async function resetPwd(u){ const pw=prompt(`Nouveau mot de passe pour ${u.nom_affiche} :`); if(!pw) return; const r=await api.resetPassword(u.id,pw); if(r.ok) toastSuccess('Mot de passe réinitialisé'); else toastError(r.error) }

async function addFamille(){ if(!newFam.value.trim())return; const r=await api.ajoutFamille(newFam.value); if(r.ok){familles.value.push(r.data);newFam.value=''} }
async function delFamille(f){ if(!confirm('Supprimer ?'))return; const r=await api.supprFamille(f.id); if(r.ok)familles.value=familles.value.filter(x=>x.id!==f.id); else toastError(r.error) }
async function addCat(){ if(!newCat.value.trim()||!selFam.value)return; const r=await api.ajoutCategorie(newCat.value,selFam.value); if(r.ok){categories.value.push(r.data);newCat.value=''} }
async function delCat(c){ const r=await api.supprCategorie(c.id); if(r.ok)categories.value=categories.value.filter(x=>x.id!==c.id) }
</script>

<style scoped>
.cfg-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); }
</style>
