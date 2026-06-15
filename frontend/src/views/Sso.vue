<template>
  <div class="sso-wait">
    <div class="spinner"></div>
    <p>{{ msg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../store.js'
import { api } from '../api.js'
import { startRealtime } from '../realtime.js'

const router = useRouter()
const msg = ref('Connexion en cours…')

onMounted(async () => {
  const params = new URLSearchParams(location.hash.split('?')[1] || '')
  const token = params.get('token')
  if (!token) { router.replace('/login'); return }
  store.token = token
  localStorage.setItem('indus-token', token)
  const r = await api.me()
  if (r.ok) {
    store.user = r.data
    startRealtime()
    router.replace('/')
  } else {
    store.logout()
    router.replace('/login?sso_error=' + encodeURIComponent('Session SSO invalide'))
  }
})
</script>

<style scoped>
.sso-wait { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: var(--bg, #f1f5f9); color: var(--text-2); }
.spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--blue, #3b82f6); animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }
</style>
