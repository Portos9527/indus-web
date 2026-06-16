<template>
  <div class="page-header"><h1>⚙️ Paramètres</h1></div>
  <div class="page-content">
    <div class="tabs">
      <button v-for="t in tabs" :key="t.id" :class="['tab',{active:tab===t.id}]" @click="tab=t.id">{{ t.label }}</button>
    </div>

    <!-- SMTP -->
    <div v-show="tab==='smtp'" class="card" style="max-width:620px">
      <div class="card-header"><h3>📧 Emails (SMTP)</h3></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Serveur</label><input v-model="s.smtp.host" class="form-control" placeholder="smtp.solcera.com" /></div>
          <div class="form-group" style="max-width:110px"><label class="form-label">Port</label><input type="number" v-model.number="s.smtp.port" class="form-control" /></div>
        </div>
        <label class="chk"><input type="checkbox" v-model="s.smtp.secure" /> Connexion sécurisée (SSL/TLS)</label>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Utilisateur</label><input v-model="s.smtp.user" class="form-control" /></div>
          <div class="form-group"><label class="form-label">Mot de passe</label><input type="password" v-model="s.smtp.pass" class="form-control" placeholder="••••••" /></div>
        </div>
        <div class="form-group"><label class="form-label">Expéditeur (from)</label><input v-model="s.smtp.from" class="form-control" placeholder="indus@solcera.com" /></div>
        <div class="form-group"><label class="form-label">Emails responsables (un par ligne)</label>
          <textarea v-model="respRaw" class="form-control" rows="3"></textarea></div>
      </div>
      <div class="card-footer">
        <button class="btn btn-secondary" @click="smtpTest">🔌 Tester</button>
        <button class="btn btn-primary" @click="save">💾 Sauvegarder</button>
      </div>
    </div>

    <!-- SLA -->
    <div v-show="tab==='sla'" class="card" style="max-width:520px">
      <div class="card-header"><h3>⏱️ Délais par défaut (jours)</h3></div>
      <div class="card-body">
        <div class="form-row"><div class="form-group"><label class="form-label">🔴 Urgente</label><input type="number" v-model.number="s.sla.urgente" class="form-control" /></div>
          <div class="form-group"><label class="form-label">🟠 Haute</label><input type="number" v-model.number="s.sla.haute" class="form-control" /></div></div>
        <div class="form-row"><div class="form-group"><label class="form-label">🔵 Normale</label><input type="number" v-model.number="s.sla.normale" class="form-control" /></div>
          <div class="form-group"><label class="form-label">⚪ Faible</label><input type="number" v-model.number="s.sla.faible" class="form-control" /></div></div>
      </div>
      <div class="card-footer"><button class="btn btn-primary" @click="save">💾 Sauvegarder</button></div>
    </div>

    <!-- Diagnostic -->
    <div v-show="tab==='diag'" class="card">
      <div class="card-header"><h3>🩺 Diagnostic système</h3><button class="btn btn-secondary btn-sm" @click="loadDiag">↻ Relancer</button></div>
      <div class="table-wrap">
        <table><tbody>
          <tr v-for="x in diag" :key="x.key">
            <td style="width:24px"><span :class="['dot',x.status]"></span></td>
            <td><strong>{{ x.name }}</strong></td>
            <td style="color:var(--text-3)">{{ x.detail }}</td>
          </tr>
        </tbody></table>
      </div>
    </div>

    <!-- Console SQL -->
    <div v-show="tab==='sql'" class="card">
      <div class="card-header"><h3>🖥️ Console SQL (lecture seule)</h3></div>
      <div class="card-body">
        <textarea v-model="sqlText" class="form-control" rows="3" style="font-family:monospace" placeholder="SELECT * FROM demandes LIMIT 10;"></textarea>
        <button class="btn btn-primary btn-sm" style="margin-top:8px" @click="runSql">▶ Exécuter</button>
        <div v-if="sqlErr" style="color:var(--red);margin-top:8px;font-size:13px">⚠️ {{ sqlErr }}</div>
        <div v-if="sqlCols.length" class="table-wrap" style="margin-top:10px;max-height:400px;overflow:auto">
          <table><thead><tr><th v-for="c in sqlCols" :key="c">{{ c }}</th></tr></thead>
            <tbody><tr v-for="(r,i) in sqlRows" :key="i"><td v-for="c in sqlCols" :key="c">{{ fmt(r[c]) }}</td></tr></tbody></table>
        </div>
      </div>
    </div>

    <!-- Export -->
    <div v-show="tab==='export'" class="card" style="max-width:480px">
      <div class="card-header"><h3>📥 Export</h3></div>
      <div class="card-body">
        <p style="color:var(--text-2);font-size:13px">Exporte toutes les demandes au format CSV (Excel).</p>
        <button class="btn btn-primary" @click="api.exportCsv()">📥 Télécharger l'export CSV</button>
      </div>
    </div>

    <!-- Permissions par rôle + par utilisateur -->
    <div v-show="tab==='perms'" class="card">
      <div class="card-header"><h3>🔐 Permissions</h3><button class="btn btn-primary btn-sm" @click="save">💾 Enregistrer</button></div>
      <div class="card-body">
        <p style="color:var(--text-3);font-size:12px;margin-top:0">Droits accordés par rôle. Les surcharges par utilisateur priment sur le rôle.</p>
        <table class="perm-table">
          <thead><tr><th>Droit</th><th v-for="rk in ROLE_KEYS" :key="rk.k">{{ rk.label }}</th></tr></thead>
          <tbody>
            <tr v-for="p in PERMS" :key="p.k">
              <td>{{ p.label }}</td>
              <td v-for="rk in ROLE_KEYS" :key="rk.k" style="text-align:center">
                <input type="checkbox" :checked="permRole(rk.k, p.k)" @change="togglePermRole(rk.k, p.k, $event.target.checked)" />
              </td>
            </tr>
          </tbody>
        </table>

        <h4 style="margin:20px 0 8px">Surcharges par utilisateur</h4>
        <div class="usr-ov">
          <select v-model.number="ovUser" class="form-control" style="max-width:260px">
            <option :value="null">— Choisir un utilisateur —</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nom_affiche }} ({{ ROLE_LABEL[u.role] }})</option>
          </select>
          <div v-if="ovUser" class="usr-ov-grid">
            <label v-for="p in PERMS" :key="p.k" class="usr-ov-chk">
              <select :value="permUserState(ovUser, p.k)" @change="setPermUser(ovUser, p.k, $event.target.value)" class="form-control">
                <option value="">Hérite du rôle</option><option value="1">✅ Autorisé</option><option value="0">⛔ Refusé</option>
              </select>
              <span>{{ p.label }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Profils techniciens -->
    <div v-show="tab==='profils'" class="card">
      <div class="card-header"><h3>👥 Profils techniciens</h3><button class="btn btn-primary btn-sm" @click="save">💾 Enregistrer</button></div>
      <div class="card-body">
        <div v-for="t in techs" :key="t.id" class="prof-row">
          <div class="prof-head">
            <span class="prof-color" :style="{background: prof(t.id).couleur}"></span>
            <strong>{{ t.nom_affiche }}</strong>
          </div>
          <div class="prof-fields">
            <label>Dispo
              <select :value="prof(t.id).dispo" @change="setProf(t.id,'dispo',$event.target.value)" class="form-control">
                <option value="available">🟢 Disponible</option><option value="partial">🟡 Partielle</option><option value="absent">🔴 Absent</option>
              </select>
            </label>
            <label>Capacité max
              <input type="number" min="1" max="20" :value="prof(t.id).capacite" @change="setProf(t.id,'capacite',+$event.target.value)" class="form-control" style="width:80px" />
            </label>
            <label>Couleur Gantt
              <input type="color" :value="prof(t.id).couleur" @change="setProf(t.id,'couleur',$event.target.value)" />
            </label>
            <label style="flex:1;min-width:200px">Compétences (séparées par virgule)
              <input :value="(prof(t.id).competences||[]).join(', ')" @change="setProf(t.id,'competences',$event.target.value.split(',').map(s=>s.trim()).filter(Boolean))" class="form-control" />
            </label>
          </div>
        </div>
        <div v-if="techs.length===0" style="color:var(--text-3);font-size:13px">Aucun technicien</div>
      </div>
    </div>

    <!-- Éditeur : explorateur de tables -->
    <div v-show="tab==='editeur'" class="card">
      <div class="card-header"><h3>👑 Explorateur de données</h3></div>
      <div class="ed-wrap">
        <div class="ed-tables">
          <button v-for="t in edTables" :key="t.name" :class="['ed-tbtn',{active:edTable===t.name}]" @click="openTable(t.name)">
            {{ t.name }} <span class="ed-count">{{ t.count }}</span>
          </button>
        </div>
        <div class="ed-data">
          <div v-if="!edTable" style="color:var(--text-3);padding:20px">Sélectionnez une table</div>
          <template v-else>
            <div style="padding:8px 0;color:var(--text-3);font-size:13px">{{ edTable }} — {{ edTotal }} ligne(s)</div>
            <div class="table-wrap" style="max-height:420px;overflow:auto">
              <table><thead><tr><th v-for="c in edCols" :key="c">{{ c }}</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(row,i) in edRows" :key="i">
                    <td v-for="c in edCols" :key="c" :title="fmt(row[c])" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ fmt(row[c]) }}</td>
                    <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" @click="editRow(row)">✏️</button><button class="btn btn-ghost btn-sm" @click="delRow(row)">🗑️</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal édition ligne -->
    <div v-if="rowModal" class="modal-overlay" @click.self="rowModal=null">
      <div class="modal">
        <div class="modal-header"><h2>✏️ {{ edTable }} #{{ rowModal.id }}</h2><button class="btn btn-ghost btn-sm" @click="rowModal=null">✕</button></div>
        <div class="modal-body">
          <div v-for="c in edCols" :key="c" class="form-group">
            <label class="form-label">{{ c }}</label>
            <input v-model="rowModal[c]" class="form-control" :disabled="c==='id'" />
          </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" @click="rowModal=null">Annuler</button><button class="btn btn-primary" @click="saveRow">💾 Enregistrer</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { store, toastSuccess, toastError, ROLE_LABEL } from '../store.js'
import { api } from '../api.js'

const role = computed(() => store.user?.role ?? 0)
const isAdmin = computed(() => role.value >= 3)
const isEditeur = computed(() => role.value >= 4)
const tabs = computed(() => {
  const t = [
    { id:'sla', label:'⏱️ Délais' },
    { id:'perms', label:'🔐 Permissions' },
    { id:'profils', label:'👥 Profils techniciens' },
  ]
  if (isAdmin.value) t.push({ id:'smtp', label:'📧 SMTP' }, { id:'diag', label:'🩺 Diagnostic' }, { id:'sql', label:'🖥️ SQL' }, { id:'export', label:'📥 Export' })
  if (isEditeur.value) t.push({ id:'editeur', label:'👑 Éditeur (tables)' })
  return t
})
const tab = ref('sla')
const s = ref({ smtp:{host:'',port:587,secure:false,user:'',pass:'',from:'',responsables:[]}, sla:{urgente:3,haute:7,normale:14,faible:30} })
const respRaw = ref('')
const diag = ref([])
const sqlText = ref(''); const sqlRows = ref([]); const sqlCols = ref([]); const sqlErr = ref('')

// Permissions
const ROLE_KEYS = [{k:'demandeur',label:'Demandeur'},{k:'technicien',label:'Tech.'},{k:'responsable',label:'Resp.'},{k:'admin',label:'Admin'}]
const PERMS = [
  {k:'creer',label:'Créer une demande'},{k:'valider',label:'Valider / Rejeter'},
  {k:'planCharge',label:'Voir le plan de charge'},{k:'toutesDemandes',label:'Voir toutes les demandes'},
  {k:'congesGerer',label:'Gérer les congés'},{k:'tempsMasque',label:'Déclarer du temps masqué'},
  {k:'dashboard',label:'Voir le dashboard'},{k:'export',label:'Exporter les données'},
]
const users = ref([]); const ovUser = ref(null)
// Profils techniciens
const techs = ref([])
const PROF_DEF = { dispo:'available', capacite:5, couleur:'#3B82F6', competences:[] }
// Éditeur
const edTables = ref([]); const edTable = ref(null); const edCols = ref([]); const edRows = ref([]); const edTotal = ref(0); const rowModal = ref(null)

onMounted(async () => {
  // Admin : accès complet ; Responsable : réglages d'équipe uniquement (sans SMTP)
  const settingsCall = isAdmin.value ? api.getSettings() : api.teamSettings()
  const calls = [settingsCall, api.techniciens()]
  if (isAdmin.value) calls.push(api.users())   // liste complète pour surcharges
  else calls.push(api.equipe())                // responsable : son équipe
  const [r, t, u] = await Promise.all(calls)
  if (r.ok) { s.value = { smtp:{host:'',port:587,secure:false,user:'',pass:'',from:'',responsables:[]}, permsRole:{}, permsUser:{}, techProfiles:{}, ...s.value, ...r.data }; respRaw.value = (r.data.smtp?.responsables || []).join('\n') }
  if (t.ok) techs.value = t.data
  if (u.ok) users.value = u.data
  if (isAdmin.value) loadDiag()
})
async function save() {
  if (isAdmin.value) {
    s.value.smtp.responsables = respRaw.value.split('\n').map(x=>x.trim()).filter(Boolean)
    const r = await api.saveSettings({ smtp:s.value.smtp, sla:s.value.sla, permsRole:s.value.permsRole, permsUser:s.value.permsUser, techProfiles:s.value.techProfiles })
    r.ok ? toastSuccess('Paramètres enregistrés') : toastError(r.error)
  } else {
    const r = await api.saveTeamSettings({ sla:s.value.sla, permsRole:s.value.permsRole, permsUser:s.value.permsUser, techProfiles:s.value.techProfiles })
    r.ok ? toastSuccess('Paramètres enregistrés') : toastError(r.error)
  }
}

// ── Permissions ──
function permRole(rk,p){ return !!(s.value.permsRole?.[rk]?.[p]) }
function togglePermRole(rk,p,val){ if(!s.value.permsRole) s.value.permsRole={}; if(!s.value.permsRole[rk]) s.value.permsRole[rk]={}; s.value.permsRole[rk][p]=val }
function permUserState(uid,p){ const v=s.value.permsUser?.[uid]?.[p]; return v===true?'1':v===false?'0':'' }
function setPermUser(uid,p,val){ if(!s.value.permsUser) s.value.permsUser={}; if(!s.value.permsUser[uid]) s.value.permsUser[uid]={}; if(val==='') delete s.value.permsUser[uid][p]; else s.value.permsUser[uid][p]=(val==='1') }

// ── Profils techniciens ──
function prof(id){ return { ...PROF_DEF, ...(s.value.techProfiles?.[id]||{}) } }
function setProf(id,key,val){ if(!s.value.techProfiles) s.value.techProfiles={}; if(!s.value.techProfiles[id]) s.value.techProfiles[id]={...PROF_DEF}; s.value.techProfiles[id][key]=val }

// ── Éditeur tables ──
async function loadEdTables(){ const r=await api.tables(); if(r.ok) edTables.value=r.data }
watch(tab, (v) => { if (v==='editeur' && edTables.value.length===0) loadEdTables() })
async function openTable(name){ edTable.value=name; const r=await api.tableData(name,100,0); if(r.ok){ edCols.value=r.data.columns; edRows.value=r.data.rows; edTotal.value=r.data.total } }
function editRow(row){ rowModal.value={...row} }
async function saveRow(){ const r=await api.updateRow(edTable.value, rowModal.value); if(r.ok){ toastSuccess('Ligne enregistrée'); rowModal.value=null; openTable(edTable.value) } else toastError(r.error) }
async function delRow(row){ if(!confirm('Supprimer cette ligne ?'))return; const r=await api.deleteRow(edTable.value,row.id); if(r.ok){ toastSuccess('Supprimé'); openTable(edTable.value) } else toastError(r.error) }
async function smtpTest() { const r = await api.testSmtp(); r.ok ? toastSuccess(r.data.message) : toastError(r.error) }
async function loadDiag() { const r = await api.diagnostics(); if (r.ok) diag.value = r.data }
async function runSql() {
  sqlErr.value=''; const r = await api.sql(sqlText.value)
  if (r.ok) { sqlRows.value=r.data.rows; sqlCols.value=r.data.rows.length?Object.keys(r.data.rows[0]):[] }
  else { sqlErr.value=r.error; sqlRows.value=[]; sqlCols.value=[] }
}
function fmt(v){ return v===null||v===undefined?'—':(typeof v==='object'?JSON.stringify(v):String(v)) }
</script>
<style scoped>
.tabs { display:flex; gap:4px; margin-bottom:16px; flex-wrap:wrap; }
.tab { padding:7px 14px; border:1px solid var(--border); background:var(--card); border-radius:8px; cursor:pointer; font-size:13px; }
.tab.active { background:var(--blue); color:#fff; border-color:var(--blue); }
.chk { display:flex; align-items:center; gap:7px; font-size:13px; margin-bottom:12px; }
.dot { width:11px; height:11px; border-radius:50%; display:inline-block; }
.dot.ok{background:#16a34a} .dot.warn{background:#f59e0b} .dot.ko{background:#dc2626}
/* Permissions */
.perm-table { width:100%; border-collapse:collapse; font-size:13px; }
.perm-table th,.perm-table td { padding:8px 10px; border-bottom:1px solid var(--border); }
.perm-table th { text-align:center; font-size:11px; color:var(--text-3); text-transform:uppercase; }
.perm-table td:first-child,.perm-table th:first-child { text-align:left; }
.usr-ov-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:8px; margin-top:12px; }
.usr-ov-chk { display:flex; align-items:center; gap:8px; font-size:13px; }
.usr-ov-chk .form-control { width:140px; }
/* Profils */
.prof-row { border:1px solid var(--border); border-radius:10px; padding:12px; margin-bottom:10px; }
.prof-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.prof-color { width:14px; height:14px; border-radius:4px; display:inline-block; }
.prof-fields { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; }
.prof-fields label { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--text-3); }
/* Éditeur */
.ed-wrap { display:flex; gap:0; }
.ed-tables { width:200px; flex-shrink:0; border-right:1px solid var(--border); padding:10px; display:flex; flex-direction:column; gap:4px; max-height:520px; overflow:auto; }
.ed-tbtn { text-align:left; border:none; background:none; padding:8px 10px; border-radius:7px; cursor:pointer; font-size:13px; display:flex; justify-content:space-between; }
.ed-tbtn:hover { background:var(--bg,#f1f5f9); }
.ed-tbtn.active { background:var(--blue-l,#eff6ff); color:var(--blue); font-weight:700; }
.ed-count { font-size:11px; color:var(--text-3); }
.ed-data { flex:1; padding:0 16px; min-width:0; }
</style>
