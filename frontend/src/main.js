import { createApp } from 'vue'
import { router } from './router.js'
import { store } from './store.js'
import { api } from './api.js'
import { startRealtime } from './realtime.js'
import './style.css'
import App from './App.vue'

// Restaure la session si un token est présent
async function boot() {
  if (store.token) {
    const r = await api.me()
    if (r.ok) { store.user = r.data; startRealtime() }
    else store.logout()
  }
  createApp(App).use(router).mount('#app')
}

boot()
