import { Router } from 'express'
import { many } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { wrap } from '../helpers.js'

const r = Router()
r.use(authenticate, requireRole(2))

// Plan de charge : techniciens actifs + leurs demandes actives
r.get('/', wrap(async (req, res) => {
  const rows = await many(`
    SELECT u.id AS tech_id, u.nom_affiche AS tech_nom,
           d.id AS demande_id, d.outillage AS titre, d.statut, d.priorite,
           d.date_creation, d.date_objectif AS date_limite,
           COALESCE(d.avancement,0) AS avancement, d.famille
    FROM utilisateurs u
    LEFT JOIN demandes d ON d.assigne_a = u.id
      AND d.statut NOT IN ('Clôturée','Rejetée','Abandonnée')
    WHERE u.role >= 1 AND u.actif = 1
    ORDER BY u.nom_affiche, d.date_objectif NULLS LAST`)

  // Grouper par technicien
  const map = new Map()
  for (const row of rows) {
    if (!map.has(row.tech_id)) map.set(row.tech_id, { id: row.tech_id, nom_affiche: row.tech_nom, demandes: [] })
    if (row.demande_id) {
      map.get(row.tech_id).demandes.push({
        id: row.demande_id, titre: row.titre, statut: row.statut, priorite: row.priorite,
        date_creation: row.date_creation, date_limite: row.date_limite,
        avancement: row.avancement, famille: row.famille,
      })
    }
  }
  res.json([...map.values()])
}))

export default r
