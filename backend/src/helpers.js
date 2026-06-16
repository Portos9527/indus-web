import { pool, scalar, one } from './db.js'
import { sendMail } from './email.js'

export const now = () => new Date().toISOString().slice(0, 19)
export const today = () => new Date().toISOString().slice(0, 10)

export async function nextNumero() {
  const year = new Date().getFullYear()
  // nextval via une séquence implicite : on prend le max existant + 1 de façon atomique
  const n = await scalar(
    `SELECT COALESCE(MAX(CAST(split_part(numero,'-',3) AS INTEGER)), 0) + 1
     FROM demandes WHERE numero LIKE $1`,
    [`DEM-${year}-%`]
  )
  return `DEM-${year}-${String(n).padStart(4, '0')}`
}

export async function addHistorique(demandeId, userId, action, details) {
  await pool.query(
    'INSERT INTO historique (demande_id, user_id, date, action, details) VALUES ($1,$2,$3,$4,$5)',
    [demandeId, userId, now(), action, details ? JSON.stringify(details) : null]
  )
}

export async function addAudit(userId, utilisateur, action, details) {
  await pool.query(
    'INSERT INTO audit_log (timestamp, user_id, utilisateur, action, details) VALUES ($1,$2,$3,$4,$5)',
    [now(), userId, utilisateur, action, details ? JSON.stringify(details) : null]
  )
}

export async function notify(userId, demandeId, type, message) {
  if (!userId) return
  await pool.query(
    'INSERT INTO notifications (user_id, demande_id, type, message, lue, date) VALUES ($1,$2,$3,$4,0,$5)',
    [userId, demandeId, type, message, now()]
  )
  // Email si l'utilisateur a activé les notifications mail + email renseigné (non bloquant)
  try {
    const u = await one('SELECT email, notif_mail FROM utilisateurs WHERE id=$1', [userId])
    if (u?.notif_mail && u.email) {
      sendMail(u.email, 'INDUS — notification', `<p>${message}</p>`).catch(() => {})
    }
  } catch { /* ignore */ }
}

// Petit wrapper pour gérer proprement les erreurs async dans les routes Express
export const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e)
    res.status(500).json({ error: e.message || 'Erreur serveur' })
  })
