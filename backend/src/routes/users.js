import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { many, one, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { now, wrap } from '../helpers.js'

const r = Router()
r.use(authenticate)

const SAFE = 'id, nom_session, nom_affiche, role, initiales, email, actif, notif_mail, derniere_connexion, date_creation'

// Tous les utilisateurs (admin)
r.get('/', requireRole(3), wrap(async (req, res) => {
  const filtre = req.user.role >= 4 ? '' : 'WHERE role < 4'
  res.json(await many(`SELECT ${SAFE} FROM utilisateurs ${filtre} ORDER BY nom_affiche`))
}))

// Techniciens actifs (pour assignation)
r.get('/techniciens', wrap(async (req, res) => {
  res.json(await many(`SELECT ${SAFE} FROM utilisateurs WHERE role >= 1 AND actif = 1 ORDER BY nom_affiche`))
}))

// Membres gérés par un responsable (demandeurs + techniciens)
r.get('/equipe', requireRole(2), wrap(async (req, res) => {
  res.json(await many(`SELECT ${SAFE} FROM utilisateurs WHERE role <= 1 ORDER BY role DESC, nom_affiche`))
}))

// Créer un utilisateur (admin)
r.post('/', requireRole(3), wrap(async (req, res) => {
  const { nom_session, nom_affiche, password, role, email } = req.body
  if (!nom_session || !nom_affiche || !password) return res.status(400).json({ error: 'Champs requis manquants' })
  const exists = await one('SELECT id FROM utilisateurs WHERE nom_session=$1', [nom_session])
  if (exists) return res.status(400).json({ error: 'Ce login existe déjà' })
  const hash = await bcrypt.hash(password, 10)
  const initiales = nom_affiche.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const u = await one(
    `INSERT INTO utilisateurs (nom_session, nom_affiche, mot_de_passe, role, initiales, email, actif, date_creation)
     VALUES ($1,$2,$3,$4,$5,$6,1,$7) RETURNING ${SAFE}`,
    [nom_session, nom_affiche, hash, role ?? 0, initiales, email || null, now()]
  )
  res.json(u)
}))

// Modifier (admin)
r.put('/:id', requireRole(3), wrap(async (req, res) => {
  const { nom_affiche, initiales, role, email, actif } = req.body
  if (Number(req.params.id) === req.user.id && actif === 0)
    return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' })
  // Protection du rôle Éditeur (4) : seul un Éditeur peut toucher/attribuer ce niveau
  const cible = await one('SELECT role FROM utilisateurs WHERE id=$1', [req.params.id])
  if (cible && cible.role === 4 && req.user.role < 4) return res.status(403).json({ error: 'Compte Éditeur protégé' })
  if (Number(role) === 4 && req.user.role < 4) return res.status(403).json({ error: 'Seul un Éditeur peut attribuer ce rôle' })
  const u = await one(
    `UPDATE utilisateurs SET nom_affiche=$1, initiales=$2, role=$3, email=$4, actif=$5
     WHERE id=$6 RETURNING ${SAFE}`,
    [nom_affiche, initiales, role, email, actif, req.params.id]
  )
  res.json(u)
}))

// Activer/désactiver (admin)
r.post('/:id/toggle', requireRole(3), wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Action impossible sur votre compte' })
  const u = await one(
    `UPDATE utilisateurs SET actif = CASE WHEN actif=1 THEN 0 ELSE 1 END WHERE id=$1 RETURNING ${SAFE}`,
    [req.params.id]
  )
  res.json(u)
}))

// Activer/désactiver les notifications email d'un utilisateur (responsable+ pour son équipe)
r.post('/:id/notif-mail', requireRole(2), wrap(async (req, res) => {
  const cible = await one('SELECT role FROM utilisateurs WHERE id=$1', [req.params.id])
  if (!cible) return res.status(404).json({ error: 'Utilisateur introuvable' })
  // un responsable (2) ne gère que les rôles strictement inférieurs ; un admin gère tout le monde
  if (req.user.role < 3 && cible.role >= req.user.role) return res.status(403).json({ error: 'Hors de votre périmètre' })
  const val = req.body?.enabled ? 1 : 0
  const u = await one(`UPDATE utilisateurs SET notif_mail=$1 WHERE id=$2 RETURNING ${SAFE}`, [val, req.params.id])
  res.json(u)
}))

// Réinitialiser un mot de passe (admin)
r.post('/:id/reset-password', requireRole(3), wrap(async (req, res) => {
  const { password } = req.body
  if (!password || password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court' })
  const hash = await bcrypt.hash(password, 10)
  await pool.query('UPDATE utilisateurs SET mot_de_passe=$1 WHERE id=$2', [hash, req.params.id])
  res.json({ ok: true })
}))

export default r
