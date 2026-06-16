// Surveillance de l'état de l'API (en ligne / hors ligne).
import { store } from './store.js'

export async function pingHealth() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    const r = await fetch('/api/health', { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(t)
    store.online = r.ok
  } catch {
    store.online = false
  }
}

export function startHealth() {
  pingHealth()
  setInterval(pingHealth, 15000)
  window.addEventListener('online', pingHealth)
  window.addEventListener('offline', () => { store.online = false })
}
