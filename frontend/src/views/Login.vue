<template>
  <div class="login-page">
    <div class="login-shell">
      <!-- En-tête marque -->
      <div class="login-top">
        <img :src="logoUrl" class="login-logo" alt="INDUS" />
        <div>
          <h1 class="login-brand">INDUS</h1>
          <p class="login-tag">Gestion des Demandes d'Ingénierie</p>
        </div>
      </div>

      <div class="login-cols" :class="{ solo: !ssoEnabled }">
        <!-- Connexion manuelle -->
        <div class="col">
          <h2 class="col-title">Connexion à votre compte</h2>
          <form @submit.prevent="submit" class="login-form">
            <div class="field">
              <span class="field-icon">👤</span>
              <input v-model="login" class="field-input" placeholder="Identifiant" autocomplete="username" autofocus />
            </div>
            <div class="field">
              <span class="field-icon">🔒</span>
              <input v-model="password" :type="show ? 'text' : 'password'" class="field-input"
                     placeholder="Mot de passe" autocomplete="current-password" />
              <button type="button" class="field-eye" @click="show = !show" tabindex="-1">{{ show ? '🙈' : '👁️' }}</button>
            </div>
            <transition name="err"><div v-if="error" class="login-error">⚠️ {{ error }}</div></transition>
            <button class="login-btn" :disabled="loading || !login || !password">
              <span v-if="loading" class="spinner"></span>{{ loading ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>
        </div>

        <!-- Connexion automatique (SSO SAML) -->
        <div v-if="ssoEnabled" class="col col-sso">
          <h2 class="col-title">Connexion automatique</h2>
          <button class="sso-tile" @click="loginSso">
            <span class="sso-windows">
              <span></span><span></span><span></span><span></span>
            </span>
            <span class="sso-label">Connexion Automatique</span>
          </button>
          <p class="sso-hint">Via votre session SOLCERA</p>
        </div>
      </div>

      <div class="login-help">
        <StatusBadge />
        <span>Besoin d'aide ? Contactez votre administrateur · poste 1309</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store.js'
import { api } from '../api.js'
import { startRealtime } from '../realtime.js'
import StatusBadge from '../components/StatusBadge.vue'
import logoUrl from '../assets/logo.png'

const router = useRouter()
const login = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const show = ref(false)
const ssoEnabled = ref(false)

onMounted(async () => {
  // Erreur renvoyée par le flux SSO (?sso_error=…)
  const params = new URLSearchParams(location.hash.split('?')[1] || '')
  if (params.get('sso_error')) error.value = decodeURIComponent(params.get('sso_error'))
  const r = await api.samlEnabled()
  if (r.ok) ssoEnabled.value = r.data.enabled
})

async function submit() {
  error.value = ''
  loading.value = true
  const r = await api.login(login.value, password.value)
  loading.value = false
  if (r.ok) {
    store.setAuth(r.data.token, r.data.user)
    startRealtime()
    router.push('/')
  } else { error.value = r.error }
}

function loginSso() {
  // Redirection plein navigateur vers le backend → IdP SAML
  window.location.href = '/api/auth/saml/login'
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: linear-gradient(140deg, #eef2ff 0%, #f1f5f9 50%, #e0e7ff 100%); }
.login-shell { width: 100%; max-width: 720px; background: var(--card, #fff); border-radius: 20px;
  padding: 36px 40px; box-shadow: 0 24px 60px rgba(15,23,42,.14); }

.login-top { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
.login-logo { width: 56px; height: 56px; border-radius: 14px; box-shadow: 0 6px 18px rgba(0,0,0,.15); }
.login-brand { font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 0; color: var(--text-1); }
.login-tag { font-size: 13px; color: var(--text-3); margin: 2px 0 0; }

.login-cols { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 28px; align-items: start; }
.login-cols::before { content: ''; grid-column: 2; align-self: stretch; background: var(--border); }
.login-cols.solo { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; }
.login-cols.solo::before { display: none; }
.col-title { font-size: 15px; font-weight: 700; color: var(--text-1); margin: 0 0 18px; text-align: center; }

.login-form { display: flex; flex-direction: column; gap: 13px; }
.field { display: flex; align-items: center; background: var(--bg, #f1f5f9); border: 1.5px solid var(--border);
  border-radius: 11px; padding: 0 12px; transition: .15s; }
.field:focus-within { border-color: var(--blue); background: var(--card, #fff); box-shadow: 0 0 0 4px rgba(59,130,246,.12); }
.field-icon { font-size: 15px; opacity: .6; }
.field-input { flex: 1; border: none; background: none; outline: none; padding: 12px 10px; font-size: 14px; color: var(--text-1); }
.field-eye { background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px; opacity: .7; }
.field-eye:hover { opacity: 1; }

.login-error { background: #fef2f2; color: #b91c1c; padding: 10px 12px; border-radius: 9px; font-size: 13px; border: 1px solid #fecaca; }
.err-enter-active { transition: all .2s ease; } .err-enter-from { opacity: 0; transform: translateY(-4px); }

.login-btn { margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 13px;
  border: none; border-radius: 11px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: #fff;
  font-size: 15px; font-weight: 700; cursor: pointer; transition: .15s; box-shadow: 0 6px 18px rgba(37,99,235,.35); }
.login-btn:hover:not(:disabled) { filter: brightness(1.07); }
.login-btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
.spinner { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }

/* Tuile SSO */
.col-sso { display: flex; flex-direction: column; align-items: center; }
.sso-tile { display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%; max-width: 200px;
  padding: 26px 20px; background: var(--card, #fff); border: 1.5px solid var(--border); border-radius: 14px;
  cursor: pointer; transition: .15s; }
.sso-tile:hover { border-color: var(--blue); box-shadow: 0 8px 22px rgba(37,99,235,.18); transform: translateY(-2px); }
.sso-windows { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 46px; height: 46px; }
.sso-windows span { background: #0F172A; border-radius: 3px; }
.sso-label { font-size: 13px; font-weight: 700; color: var(--text-1); }
.sso-hint { font-size: 12px; color: var(--text-3); margin: 12px 0 0; text-align: center; }

.login-help { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-3); margin-top: 26px; padding-top: 18px; border-top: 1px solid var(--border); }

@media (max-width: 640px) {
  .login-cols { grid-template-columns: 1fr; }
  .login-cols::before { display: none; }
  .col-sso { margin-top: 8px; padding-top: 20px; border-top: 1px solid var(--border); }
}
</style>
