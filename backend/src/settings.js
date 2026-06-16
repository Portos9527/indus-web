import { one, pool } from './db.js'

const DEFAULTS = {
  smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '', responsables: [] },
  sla: { urgente: 3, haute: 7, normale: 14, faible: 30 },
  // permissions[role] = { creer, valider, voirTous, ... } ; surcharges par utilisateur via permsUser
  permsRole: {},
  permsUser: {},
  techProfiles: {}, // par technicien : { dispo, competences[], couleur, capacite }
}

export async function getSettings() {
  const row = await one('SELECT data FROM app_settings WHERE id=1')
  return { ...DEFAULTS, ...(row?.data || {}) }
}

export async function saveSettings(patch) {
  const cur = await getSettings()
  const next = { ...cur, ...patch }
  await pool.query('UPDATE app_settings SET data=$1 WHERE id=1', [JSON.stringify(next)])
  return next
}
