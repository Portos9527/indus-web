// Client temps réel (Server-Sent Events).
// Rafraîchit les vues quand un autre utilisateur modifie une demande, un congé, etc.
import { store } from './store.js'

let es = null
const listeners = new Set()

export function startRealtime() {
  if (es || !store.token) return
  es = new EventSource(`/api/events?token=${encodeURIComponent(store.token)}`)
  es.onmessage = (e) => {
    let data
    try { data = JSON.parse(e.data) } catch { return }
    listeners.forEach(fn => { try { fn(data) } catch { /* ignore */ } })
  }
  es.onerror = () => {
    // EventSource se reconnecte automatiquement ; on ferme si le token a sauté
    if (!store.token && es) { es.close(); es = null }
  }
}

export function stopRealtime() {
  if (es) { es.close(); es = null }
}

/**
 * S'abonne aux événements concernant certaines entités.
 * @param {string[]} entities  ex. ['demande'] ou ['demande','conge','temps_masque']
 * @param {Function} fn        callback appelé (debounced) lors d'un événement pertinent
 * @returns {Function} fonction de désinscription
 */
export function onEntities(entities, fn) {
  let timer = null
  const handler = (data) => {
    if (!entities.includes(data.entity)) return
    clearTimeout(timer)
    timer = setTimeout(fn, 300) // anti-rafale
  }
  listeners.add(handler)
  return () => { clearTimeout(timer); listeners.delete(handler) }
}

// Coupe le flux à la déconnexion
store.onLogout?.(stopRealtime)
