import { Router } from 'express'
import { many, one, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { now, wrap } from '../helpers.js'
import { broadcast } from '../events.js'

const r = Router()
r.use(authenticate)

// Temps masqué d'une demande
r.get('/demande/:demandeId', wrap(async (req, res) => {
  res.json(await many(
    'SELECT id, demande_id, date_debut, date_fin, motif FROM temps_masque WHERE demande_id=$1 ORDER BY date_debut',
    [req.params.demandeId]
  ))
}))

// Tout le temps masqué (responsable+ pour le plan de charge)
r.get('/', requireRole(2), wrap(async (req, res) => {
  res.json(await many('SELECT id, demande_id, date_debut, date_fin, motif FROM temps_masque ORDER BY demande_id, date_debut'))
}))

// Déclarer (technicien+)
r.post('/', requireRole(1), wrap(async (req, res) => {
  const { demande_id, date_debut, date_fin, motif } = req.body
  if (date_fin < date_debut) return res.status(400).json({ error: 'Dates invalides' })
  const id = (await one(
    `INSERT INTO temps_masque (demande_id, date_debut, date_fin, motif, cree_par, date_creation)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [demande_id, date_debut, date_fin, motif, req.user.id, now()]
  )).id
  broadcast('temps_masque', 'create', Number(demande_id))
  res.json(await one('SELECT id, demande_id, date_debut, date_fin, motif FROM temps_masque WHERE id=$1', [id]))
}))

// Supprimer (technicien+)
r.delete('/:id', requireRole(1), wrap(async (req, res) => {
  await pool.query('DELETE FROM temps_masque WHERE id=$1', [req.params.id])
  broadcast('temps_masque', 'delete', Number(req.params.id))
  res.json({ ok: true })
}))

export default r
