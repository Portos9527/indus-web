import { createApp } from 'vue'
import { router } from './router.js'
import { store } from './store.js'
import { api } from './api.js'
import { startRealtime } from './realtime.js'
import { startHealth } from './health.js'
import './style.css'
import App from './App.vue'

// Rafraîchit le profil courant (rôle, etc.) sans recharger la page.
// Permet qu'un changement de rôle fait par un admin se propage en direct.
async function refreshMe() {
  if (!store.token) return
  const r = await api.me()
  if (r.ok && r.data) store.user = r.data
}

// Restaure la session si un token est présent
async function boot() {
  if (store.token) {
    const r = await api.me()
    if (r.ok) { store.user = r.data; startRealtime() }
    else store.logout()
  }
  createApp(App).use(router).mount('#app')

  // Surveillance en ligne / hors ligne
  startHealth()

  // Auto-rafraîchissement du profil : au retour sur l'onglet + toutes les 30 s
  window.addEventListener('focus', refreshMe)
  setInterval(refreshMe, 30000)
}

boot()
