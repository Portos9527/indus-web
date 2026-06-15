import { Router } from 'express'
import { many, one, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { now, wrap } from '../helpers.js'
import { broadcast } from '../events.js'

const r = Router()
r.use(authenticate)

const SEL = `SELECT c.id, c.technicien_id, u.nom_affiche AS technicien_nom, c.date_debut, c.date_fin, c.motif
             FROM conges c LEFT JOIN utilisateurs u ON u.id = c.technicien_id`

// Tous les congés (responsable+)
r.get('/', requireRole(2), wrap(async (req, res) => {
  res.json(await many(`${SEL} ORDER BY c.date_debut DESC`))
}))

// Congés chevauchant une période pour un technicien
r.get('/check', wrap(async (req, res) => {
  const { technicien_id, date_debut, date_fin } = req.query
  res.json(await many(
    `${SEL} WHERE c.technicien_id=$1 AND c.date_debut<=$3 AND c.date_fin>=$2 ORDER BY c.date_debut`,
    [technicien_id, date_debut, date_fin]
  ))
}))

// Ajouter (responsable+)
r.post('/', requireRole(2), wrap(async (req, res) => {
  const { technicien_id, date_debut, date_fin, motif } = req.body
  if (date_fin < date_debut) return res.status(400).json({ error: 'Dates invalides' })
  const id = (await one(
    `INSERT INTO conges (technicien_id, date_debut, date_fin, motif, cree_par, date_creation)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [technicien_id, date_debut, date_fin, motif, req.user.id, now()]
  )).id
  broadcast('conge', 'create', id)
  res.json(await one(`${SEL} WHERE c.id=$1`, [id]))
}))

// Supprimer (responsable+)
r.delete('/:id', requireRole(2), wrap(async (req, res) => {
  await pool.query('DELETE FROM conges WHERE id=$1', [req.params.id])
  broadcast('conge', 'delete', Number(req.params.id))
  res.json({ ok: true })
}))

export default r
