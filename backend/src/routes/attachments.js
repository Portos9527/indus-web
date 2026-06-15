import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { many, one, pool } from '../db.js'
import { authenticate } from '../auth.js'
import { now, wrap } from '../helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Dossier de stockage sur la VM (configurable via UPLOAD_DIR)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Buffer.from(file.originalname, 'latin1').toString('utf8').replace(/[^\w.\-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }) // 25 Mo

const r = Router()
r.use(authenticate)

// Liste des pièces jointes d'une demande
r.get('/:demandeId', wrap(async (req, res) => {
  res.json(await many(
    'SELECT id, demande_id, nom_fichier, chemin_relatif, date_ajout, ajoute_par FROM pieces_jointes WHERE demande_id=$1 ORDER BY id DESC',
    [req.params.demandeId]
  ))
}))

// Upload d'un fichier
r.post('/:demandeId', upload.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })
  const nom = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
  const id = (await one(
    `INSERT INTO pieces_jointes (demande_id, nom_fichier, chemin_relatif, date_ajout, ajoute_par)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [req.params.demandeId, nom, req.file.filename, now(), req.user.id]
  )).id
  res.json({ id, nom_fichier: nom, chemin_relatif: req.file.filename, date_ajout: now() })
}))

// Téléchargement
r.get('/file/:id', wrap(async (req, res) => {
  const pj = await one('SELECT nom_fichier, chemin_relatif FROM pieces_jointes WHERE id=$1', [req.params.id])
  if (!pj) return res.status(404).json({ error: 'Introuvable' })
  const full = path.join(UPLOAD_DIR, pj.chemin_relatif)
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'Fichier absent du disque' })
  res.download(full, pj.nom_fichier)
}))

// Suppression
r.delete('/:id', wrap(async (req, res) => {
  const pj = await one('SELECT chemin_relatif FROM pieces_jointes WHERE id=$1', [req.params.id])
  if (pj) {
    const full = path.join(UPLOAD_DIR, pj.chemin_relatif)
    fs.existsSync(full) && fs.unlinkSync(full)
    await pool.query('DELETE FROM pieces_jointes WHERE id=$1', [req.params.id])
  }
  res.json({ ok: true })
}))

export default r
