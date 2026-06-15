import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { one, pool } from '../db.js'
import { signToken, authenticate } from '../auth.js'
import { now, wrap, addAudit } from '../helpers.js'

const r = Router()

// POST /api/auth/login  { login, password }
r.post('/login', wrap(async (req, res) => {
  const { login, password } = req.body
  if (!login || !password) return res.status(400).json({ error: 'Login et mot de passe requis' })

  const u = await one('SELECT * FROM utilisateurs WHERE nom_session = $1', [login])
  if (!u || u.actif === 0) return res.status(401).json({ error: 'Identifiants invalides ou compte désactivé' })

  const ok = u.mot_de_passe && await bcrypt.compare(password, u.mot_de_passe)
  if (!ok) return res.status(401).json({ error: 'Identifiants invalides' })

  await pool.query('UPDATE utilisateurs SET derniere_connexion = $1 WHERE id = $2', [now(), u.id])
  await addAudit(u.id, u.nom_affiche, 'CONNEXION', null)

  res.json({
    token: signToken(u),
    user: { id: u.id, nom_session: u.nom_session, nom_affiche: u.nom_affiche, role: u.role, initiales: u.initiales, email: u.email },
  })
}))

// GET /api/auth/me
r.get('/me', authenticate, (req, res) => res.json(req.user))

// POST /api/auth/change-password  { ancien, nouveau }
r.post('/change-password', authenticate, wrap(async (req, res) => {
  const { ancien, nouveau } = req.body
  if (!nouveau || nouveau.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (min. 4 caractères)' })
  const u = await one('SELECT mot_de_passe FROM utilisateurs WHERE id = $1', [req.user.id])
  if (u.mot_de_passe && !(await bcrypt.compare(ancien || '', u.mot_de_passe))) {
    return res.status(400).json({ error: 'Ancien mot de passe incorrect' })
  }
  const hash = await bcrypt.hash(nouveau, 10)
  await pool.query('UPDATE utilisateurs SET mot_de_passe = $1 WHERE id = $2', [hash, req.user.id])
  res.json({ ok: true })
}))

export default r
