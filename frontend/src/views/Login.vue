<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">INDUS</div>
      <div class="login-sub">Gestion des Demandes d'Ingénierie</div>

      <form @submit.prevent="submit" class="login-form">
        <div class="form-group">
          <label class="form-label">Identifiant</label>
          <input v-model="login" class="form-control" autocomplete="username" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <input v-model="password" type="password" class="form-control" autocomplete="current-password" />
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button class="btn btn-primary login-btn" :disabled="loading || !login || !password">
          {{ loading ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store.js'
import { api } from '../api.js'
import { startRealtime } from '../realtime.js'

const router = useRouter()
const login = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

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
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0D1117; padding: 20px; }
.login-card { background: var(--card); border-radius: 18px; padding: 40px; width: 380px; max-width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,.4); }
.login-logo { font-size: 36px; font-weight: 900; letter-spacing: 4px; text-align: center; color: var(--blue); }
.login-sub { text-align: center; color: var(--text-3); font-size: 13px; margin: 4px 0 28px; }
.login-form { display: flex; flex-direction: column; gap: 14px; }
.login-error { background: #fef2f2; color: #b91c1c; padding: 10px 12px; border-radius: 8px; font-size: 13px; }
.login-btn { width: 100%; margin-top: 6px; padding: 11px; }
</style>
