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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { toastSuccess, toastError } from '../store.js'
import { api } from '../api.js'

const tabs = [
  { id:'smtp', label:'📧 SMTP' }, { id:'sla', label:'⏱️ Délais' },
  { id:'diag', label:'🩺 Diagnostic' }, { id:'sql', label:'🖥️ SQL' }, { id:'export', label:'📥 Export' },
]
const tab = ref('smtp')
const s = ref({ smtp:{host:'',port:587,secure:false,user:'',pass:'',from:'',responsables:[]}, sla:{urgente:3,haute:7,normale:14,faible:30} })
const respRaw = ref('')
const diag = ref([])
const sqlText = ref(''); const sqlRows = ref([]); const sqlCols = ref([]); const sqlErr = ref('')

onMounted(async () => {
  const r = await api.getSettings()
  if (r.ok) { s.value = { ...s.value, ...r.data }; respRaw.value = (r.data.smtp?.responsables || []).join('\n') }
  loadDiag()
})
async function save() {
  s.value.smtp.responsables = respRaw.value.split('\n').map(x=>x.trim()).filter(Boolean)
  const r = await api.saveSettings({ smtp: s.value.smtp, sla: s.value.sla })
  if (r.ok) toastSuccess('Paramètres enregistrés'); else toastError(r.error)
}
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
</style>
