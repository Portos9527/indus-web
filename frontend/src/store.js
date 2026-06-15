import { reactive } from 'vue'

export const store = reactive({
  token: localStorage.getItem('indus-token') || null,
  user: null,
  familles: [],
  categories: [],
  badges: { validation: 0, notifs: 0 },
  toasts: [],
  darkMode: localStorage.getItem('indus-dark') === 'true',

  _logoutHooks: [],
  onLogout(fn) { this._logoutHooks.push(fn) },
  setAuth(token, user) {
    this.token = token
    this.user = user
    localStorage.setItem('indus-token', token)
  },
  logout() {
    this.token = null
    this.user = null
    localStorage.removeItem('indus-token')
    this._logoutHooks.forEach(f => { try { f() } catch { /* ignore */ } })
    if (location.hash !== '#/login') location.hash = '#/login'
  },
})

if (store.darkMode) document.body.classList.add('dark-mode')

export function toggleDark() {
  store.darkMode = !store.darkMode
  localStorage.setItem('indus-dark', store.darkMode)
  document.body.classList.toggle('dark-mode', store.darkMode)
}

// ── Toasts ──
let toastId = 0
export function toast(message, type = 'info') {
  const id = ++toastId
  store.toasts.push({ id, message, type })
  setTimeout(() => {
    const i = store.toasts.findIndex(t => t.id === id)
    if (i !== -1) store.toasts.splice(i, 1)
  }, 3500)
}
export const toastSuccess = m => toast(m, 'success')
export const toastError   = m => toast(m, 'error')
export const toastInfo    = m => toast(m, 'info')

// ── Helpers rôle ──
export const ROLE_LABEL = ['Demandeur', 'Technicien', 'Responsable', 'Admin']
export const roleLabel = r => ROLE_LABEL[r] || 'Inconnu'

// ── Helpers format ──
export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export function isOverdue(dateObjectif, statut) {
  if (!dateObjectif) return false
  const terminaux = ['Clôturée', 'Rejetée', 'Abandonnée']
  if (terminaux.includes(statut)) return false
  return dateObjectif.slice(0, 10) < new Date().toISOString().slice(0, 10)
}
export function statutClass(statut) {
  return {
    'Nouvelle': 'badge-nouvelle', 'En cours': 'badge-en-cours',
    'En attente de validation': 'badge-attente', 'Clôturée': 'badge-cloturee',
    'Abandonnée': 'badge-abandonnee', 'Rejetée': 'badge-rejetee',
  }[statut] || 'badge-normale'
}
const AVATAR_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#84CC16']
export const avatarColor = id => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]
export const initials = nom => (nom || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
