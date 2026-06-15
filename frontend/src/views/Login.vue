<template>
  <div class="login-page">
    <!-- Panneau gauche : marque -->
    <div class="login-brand">
      <div class="brand-glow"></div>
      <div class="brand-content">
        <img :src="logoUrl" class="brand-logo" alt="INDUS" />
        <h1 class="brand-title">INDUS</h1>
        <p class="brand-tagline">Gestion des Demandes d'Ingénierie</p>
        <ul class="brand-features">
          <li><span>📋</span> Suivi des demandes de travaux</li>
          <li><span>📈</span> Plan de charge en temps réel</li>
          <li><span>✅</span> Validation &amp; workflow d'équipe</li>
        </ul>
      </div>
      <div class="brand-footer">Solcera — Ingénierie Industrielle</div>
    </div>

    <!-- Panneau droit : formulaire -->
    <div class="login-form-wrap">
      <div class="login-card">
        <img :src="logoUrl" class="login-logo-mobile" alt="INDUS" />
        <h2 class="login-heading">Connexion</h2>
        <p class="login-subheading">Accédez à votre espace de travail</p>

        <form @submit.prevent="submit" class="login-form">
          <div class="field">
            <span class="field-icon">👤</span>
            <input v-model="login" class="field-input" placeholder="Identifiant"
                   autocomplete="username" autofocus />
          </div>
          <div class="field">
            <span class="field-icon">🔒</span>
            <input v-model="password" :type="show ? 'text' : 'password'" class="field-input"
                   placeholder="Mot de passe" autocomplete="current-password" />
            <button type="button" class="field-eye" @click="show = !show" tabindex="-1">
              {{ show ? '🙈' : '👁️' }}
            </button>
          </div>

          <transition name="err">
            <div v-if="error" class="login-error">⚠️ {{ error }}</div>
          </transition>

          <button class="login-btn" :disabled="loading || !login || !password">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>

        <div class="login-help">Besoin d'aide ? Contactez votre administrateur · poste 1309</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store.js'
import { api } from '../api.js'
import { startRealtime } from '../realtime.js'
import logoUrl from '../assets/logo.png'

const router = useRouter()
const login = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const show = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  const r = await api.login(login.value, password.value)
  loading.value = false
  if (r.ok) {
    store.setAuth(r.data.token, r.data.user)
    startRealtime()
    router.push('/')
  } else {
    error.value = r.error
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  background: #0b1220;
}

/* ── Panneau marque ── */
.login-brand {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px;
  background: linear-gradient(140deg, #1e3a8a 0%, #2563eb 55%, #1d4ed8 100%);
  color: #fff;
}
.brand-glow {
  position: absolute;
  width: 600px; height: 600px;
  top: -180px; right: -180px;
  background: radial-gradient(circle, rgba(255,255,255,.22), transparent 60%);
  border-radius: 50%;
  animation: float 9s ease-in-out infinite;
}
@keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(28px) } }
.brand-content { position: relative; z-index: 1; }
.brand-logo {
  width: 84px; height: 84px; border-radius: 20px;
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  margin-bottom: 22px;
}
.brand-title { font-size: 46px; font-weight: 900; letter-spacing: 5px; margin: 0; }
.brand-tagline { font-size: 16px; opacity: .85; margin: 6px 0 36px; }
.brand-features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; }
.brand-features li { display: flex; align-items: center; gap: 12px; font-size: 15px; opacity: .95; }
.brand-features li span { font-size: 20px; }
.brand-footer { position: relative; z-index: 1; margin-top: auto; padding-top: 40px; font-size: 12px; opacity: .6; }

/* ── Panneau formulaire ── */
.login-form-wrap {
  display: flex; align-items: center; justify-content: center;
  padding: 24px; background: var(--bg, #f1f5f9);
}
.login-card {
  width: 100%; max-width: 380px;
  background: var(--card, #fff);
  border-radius: 18px;
  padding: 40px 36px;
  box-shadow: 0 20px 50px rgba(0,0,0,.12);
}
.login-logo-mobile { display: none; }
.login-heading { font-size: 26px; font-weight: 800; margin: 0; color: var(--text-1); }
.login-subheading { font-size: 14px; color: var(--text-3); margin: 4px 0 28px; }
.login-form { display: flex; flex-direction: column; gap: 14px; }

/* Champs avec icône */
.field {
  display: flex; align-items: center;
  background: var(--bg, #f1f5f9);
  border: 1.5px solid var(--border);
  border-radius: 11px;
  padding: 0 12px;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
.field:focus-within {
  border-color: var(--blue);
  background: var(--card, #fff);
  box-shadow: 0 0 0 4px rgba(59,130,246,.12);
}
.field-icon { font-size: 15px; opacity: .6; }
.field-input {
  flex: 1; border: none; background: none; outline: none;
  padding: 13px 10px; font-size: 14px; color: var(--text-1);
}
.field-eye { background: none; border: none; cursor: pointer; font-size: 15px; padding: 4px; opacity: .7; }
.field-eye:hover { opacity: 1; }

.login-error {
  background: #fef2f2; color: #b91c1c;
  padding: 10px 12px; border-radius: 9px; font-size: 13px; font-weight: 500;
  border: 1px solid #fecaca;
}
.err-enter-active { transition: all .2s ease; }
.err-enter-from { opacity: 0; transform: translateY(-4px); }

.login-btn {
  margin-top: 6px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 13px; border: none; border-radius: 11px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
  transition: filter .15s, transform .1s, box-shadow .15s;
  box-shadow: 0 6px 18px rgba(37,99,235,.35);
}
.login-btn:hover:not(:disabled) { filter: brightness(1.07); box-shadow: 0 8px 22px rgba(37,99,235,.45); }
.login-btn:active:not(:disabled) { transform: translateY(1px); }
.login-btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }

.spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

.login-help { text-align: center; font-size: 12px; color: var(--text-3); margin-top: 24px; }

/* ── Responsive : masque le panneau marque sur mobile ── */
@media (max-width: 820px) {
  .login-page { grid-template-columns: 1fr; }
  .login-brand { display: none; }
  .login-logo-mobile { display: block; width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 16px; box-shadow: 0 8px 24px rgba(0,0,0,.2); }
  .login-heading, .login-subheading { text-align: center; }
}
</style>
