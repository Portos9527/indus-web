import { Router } from 'express'
import { many, one, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { wrap } from '../helpers.js'

const r = Router()
r.use(authenticate)

// Familles
r.get('/familles', wrap(async (req, res) => {
  res.json(await many("SELECT * FROM config WHERE type='famille' ORDER BY ordre, valeur"))
}))
r.post('/familles', requireRole(3), wrap(async (req, res) => {
  const item = await one(
    "INSERT INTO config (type, valeur, parent, ordre) VALUES ('famille',$1,NULL,0) RETURNING *",
    [req.body.valeur])
  res.json(item)
}))
r.delete('/familles/:id', requireRole(3), wrap(async (req, res) => {
  const f = await one('SELECT valeur FROM config WHERE id=$1', [req.params.id])
  const used = await one('SELECT 1 FROM demandes WHERE famille=$1 LIMIT 1', [f?.valeur])
  if (used) return res.status(400).json({ error: 'Des demandes utilisent cette famille' })
  await pool.query("DELETE FROM config WHERE id=$1 OR (type='categorie' AND parent=$2)", [req.params.id, f?.valeur])
  res.json({ ok: true })
}))

// Catégories
r.get('/categories', wrap(async (req, res) => {
  const { famille } = req.query
  if (famille)
    res.json(await many("SELECT * FROM config WHERE type='categorie' AND parent=$1 ORDER BY ordre, valeur", [famille]))
  else
    res.json(await many("SELECT * FROM config WHERE type='categorie' ORDER BY parent, ordre, valeur"))
}))
r.post('/categories', requireRole(3), wrap(async (req, res) => {
  const item = await one(
    "INSERT INTO config (type, valeur, parent, ordre) VALUES ('categorie',$1,$2,0) RETURNING *",
    [req.body.valeur, req.body.famille])
  res.json(item)
}))
r.delete('/categories/:id', requireRole(3), wrap(async (req, res) => {
  await pool.query('DELETE FROM config WHERE id=$1', [req.params.id])
  res.json({ ok: true })
}))

export default r
