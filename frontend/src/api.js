// Client API REST — gère le jeton JWT et les erreurs.
import { store } from './store.js'

const BASE = '/api'

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  if (store.token) headers.Authorization = `Bearer ${store.token}`

  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    store.online = false
    return { ok: false, error: 'Serveur injoignable' }
  }
  store.online = true

  if (res.status === 401) {
    // Session expirée → déconnexion
    store.logout?.()
    return { ok: false, error: 'Session expirée' }
  }

  let data = null
  try { data = await res.json() } catch { /* pas de corps */ }

  if (!res.ok) return { ok: false, error: data?.error || `Erreur ${res.status}` }
  return { ok: true, data }
}

const get  = (p)    => request('GET', p)
const post = (p, b) => request('POST', p, b)
const put  = (p, b) => request('PUT', p, b)
const del  = (p)    => request('DELETE', p)

// Upload multipart (pièces jointes)
async function upload(path, file) {
  const fd = new FormData()
  fd.append('file', file)
  const headers = {}
  if (store.token) headers.Authorization = `Bearer ${store.token}`
  try {
    const res = await fetch(BASE + path, { method: 'POST', headers, body: fd })
    const data = await res.json().catch(() => null)
    if (!res.ok) return { ok: false, error: data?.error || `Erreur ${res.status}` }
    return { ok: true, data }
  } catch { return { ok: false, error: 'Upload échoué' } }
}

// Téléchargement authentifié (déclenche la sauvegarde navigateur)
async function download(path, filename) {
  const headers = {}
  if (store.token) headers.Authorization = `Bearer ${store.token}`
  const res = await fetch(BASE + path, { headers })
  if (!res.ok) return { ok: false, error: `Erreur ${res.status}` }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename || 'fichier'
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
  return { ok: true }
}

export const api = {
  // Auth
  login:          (login, password) => post('/auth/login', { login, password }),
  me:             ()                => get('/auth/me'),
  samlEnabled:    ()                => get('/auth/saml/enabled'),
  changePassword: (ancien, nouveau) => post('/auth/change-password', { ancien, nouveau }),

  // Demandes
  mesDemandes:    ()        => get('/demandes/mine'),
  mesTaches:      ()        => get('/demandes/taches'),
  toutesDemandes: ()        => get('/demandes'),
  aValider:       ()        => get('/demandes/validation'),
  rechercher:     (f)       => get('/demandes/search?' + new URLSearchParams(f).toString()),
  detail:         (id)      => get('/demandes/' + id),
  creer:          (p)       => post('/demandes', p),
  valider:        (id, p)   => post(`/demandes/${id}/valider`, p),
  rejeter:        (id, m)   => post(`/demandes/${id}/rejeter`, { motif: m }),
  abandonner:     (id)      => post(`/demandes/${id}/abandonner`),
  avancement:     (id, p)   => post(`/demandes/${id}/avancement`, p),
  evaluer:        (id, p)   => post(`/demandes/${id}/evaluer`, p),
  modifier:       (id, p)   => put('/demandes/' + id, p),

  // Users
  users:          ()        => get('/users'),
  techniciens:    ()        => get('/users/techniciens'),
  equipe:         ()        => get('/users/equipe'),
  creerUser:      (p)       => post('/users', p),
  modifierUser:   (id, p)   => put('/users/' + id, p),
  toggleUser:     (id)      => post(`/users/${id}/toggle`),
  resetPassword:  (id, pw)  => post(`/users/${id}/reset-password`, { password: pw }),

  // Congés
  conges:         ()        => get('/conges'),
  congesCheck:    (f)       => get('/conges/check?' + new URLSearchParams(f).toString()),
  ajoutConge:     (p)       => post('/conges', p),
  supprConge:     (id)      => del('/conges/' + id),

  // Temps masqué
  tempsMasque:    (did)     => get('/temps-masque/demande/' + did),
  tousTempsMasque:()        => get('/temps-masque'),
  ajoutMasque:    (p)       => post('/temps-masque', p),
  supprMasque:    (id)      => del('/temps-masque/' + id),

  // Plan de charge
  planDeCharge:   ()        => get('/plan-de-charge'),

  // Dashboard
  dashboard:      (mois)    => get('/dashboard/global?mois=' + (mois || 3)),
  dashboardTech:  ()        => get('/dashboard/tech'),

  // Config
  familles:       ()        => get('/config/familles'),
  categories:     (f)       => get('/config/categories' + (f ? '?famille=' + encodeURIComponent(f) : '')),
  ajoutFamille:   (v)       => post('/config/familles', { valeur: v }),
  supprFamille:   (id)      => del('/config/familles/' + id),
  ajoutCategorie: (v, f)    => post('/config/categories', { valeur: v, famille: f }),
  supprCategorie: (id)      => del('/config/categories/' + id),

  // Commentaires
  commentaires:   (did)     => get('/commentaires/' + did),
  ajoutComment:   (did, t)  => post('/commentaires', { demande_id: did, texte: t }),

  // Notifications
  notifications:  ()        => get('/notifications'),
  unread:         ()        => get('/notifications/unread'),
  lire:           (id)      => post(`/notifications/${id}/read`),
  lireTout:       ()        => post('/notifications/read-all'),
  badgeValid:     ()        => get('/notifications/badge-validation'),

  // Audit
  audit:          (page)    => get('/audit?page=' + (page || 0)),

  // Pièces jointes (stockage VM)
  pieces:         (did)     => get('/pieces/' + did),
  uploadPiece:    (did, f)  => upload('/pieces/' + did, f),
  telechargerPiece:(id, nom)=> download('/pieces/file/' + id, nom),
  supprPiece:     (id)      => del('/pieces/' + id),

  // Admin : paramètres, diagnostics, SQL, export
  getSettings:    ()        => get('/admin/settings'),
  saveSettings:   (p)       => put('/admin/settings', p),
  testSmtp:       ()        => post('/admin/smtp-test'),
  diagnostics:    ()        => get('/admin/diagnostics'),
  sql:            (q)       => post('/admin/sql', { sql: q }),
  exportCsv:      ()        => download('/admin/export', `INDUS_export_${new Date().toISOString().slice(0,10)}.csv`),
}
