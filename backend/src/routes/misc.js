import { Router } from 'express'
import { many, one, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { now, wrap } from '../helpers.js'

const r = Router()
r.use(authenticate)

// ── Commentaires ──
r.get('/commentaires/:demandeId', wrap(async (req, res) => {
  res.json(await many(`
    SELECT c.*, u.nom_affiche AS auteur_nom, u.initiales AS auteur_initiales
    FROM commentaires c LEFT JOIN utilisateurs u ON u.id=c.auteur_id
    WHERE c.demande_id=$1 ORDER BY c.date`, [req.params.demandeId]))
}))
r.post('/commentaires', wrap(async (req, res) => {
  const { demande_id, texte } = req.body
  const id = (await one(
    'INSERT INTO commentaires (demande_id, auteur_id, date, texte) VALUES ($1,$2,$3,$4) RETURNING id',
    [demande_id, req.user.id, now(), texte])).id
  res.json(await one(`
    SELECT c.*, u.nom_affiche AS auteur_nom, u.initiales AS auteur_initiales
    FROM commentaires c LEFT JOIN utilisateurs u ON u.id=c.auteur_id WHERE c.id=$1`, [id]))
}))

// ── Notifications ──
r.get('/notifications', wrap(async (req, res) => {
  res.json(await many('SELECT * FROM notifications WHERE user_id=$1 ORDER BY date DESC LIMIT 50', [req.user.id]))
}))
r.get('/notifications/unread', wrap(async (req, res) => {
  const n = await one('SELECT COUNT(*)::INT AS c FROM notifications WHERE user_id=$1 AND lue=0', [req.user.id])
  res.json(n.c)
}))
r.post('/notifications/:id/read', wrap(async (req, res) => {
  await pool.query('UPDATE notifications SET lue=1 WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id])
  res.json({ ok: true })
}))
r.post('/notifications/read-all', wrap(async (req, res) => {
  await pool.query('UPDATE notifications SET lue=1 WHERE user_id=$1', [req.user.id])
  res.json({ ok: true })
}))
r.get('/notifications/badge-validation', wrap(async (req, res) => {
  if (req.user.role < 2) return res.json(0)
  const n = await one("SELECT COUNT(*)::INT AS c FROM demandes WHERE statut='Nouvelle'")
  res.json(n.c)
}))

// ── Journal d'audit (admin) ──
r.get('/audit', requireRole(3), wrap(async (req, res) => {
  const page = Number(req.query.page) || 0
  res.json(await many('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50 OFFSET $1', [page * 50]))
}))

export default r
