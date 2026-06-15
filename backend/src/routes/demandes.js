import { Router } from 'express'
import { many, one, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { now, today, nextNumero, addHistorique, addAudit, notify, wrap } from '../helpers.js'
import { broadcast } from '../events.js'

const r = Router()
r.use(authenticate)

const LIST = `
  SELECT d.*, ud.nom_affiche AS demandeur_nom, ua.nom_affiche AS assigne_nom,
         ua.initiales AS assigne_initiales
  FROM demandes d
  LEFT JOIN utilisateurs ud ON ud.id = d.demandeur_id
  LEFT JOIN utilisateurs ua ON ua.id = d.assigne_a`

// Mes demandes (en tant que demandeur)
r.get('/mine', wrap(async (req, res) => {
  res.json(await many(`${LIST} WHERE d.demandeur_id=$1 ORDER BY d.priorite DESC, d.date_creation DESC`, [req.user.id]))
}))

// Mes tâches (assignées)
r.get('/taches', wrap(async (req, res) => {
  res.json(await many(
    `${LIST} WHERE d.assigne_a=$1 AND d.statut NOT IN ('Clôturée','Rejetée','Abandonnée')
     ORDER BY d.priorite DESC, d.date_objectif`, [req.user.id]))
}))

// Toutes les demandes (responsable+)
r.get('/', requireRole(2), wrap(async (req, res) => {
  res.json(await many(`${LIST} ORDER BY d.priorite DESC, d.date_creation DESC`))
}))

// À valider
r.get('/validation', requireRole(2), wrap(async (req, res) => {
  res.json(await many(`${LIST} WHERE d.statut='Nouvelle' ORDER BY d.date_creation`))
}))

// Recherche
r.get('/search', wrap(async (req, res) => {
  const { texte, statut, priorite, famille } = req.query
  let sql = `${LIST} WHERE 1=1`, p = [], i = 1
  if (texte)    { sql += ` AND (d.numero || d.outillage || d.description) ILIKE $${i++}`; p.push(`%${texte}%`) }
  if (statut)   { sql += ` AND d.statut=$${i++}`; p.push(statut) }
  if (priorite) { sql += ` AND d.priorite=$${i++}`; p.push(priorite) }
  if (famille)  { sql += ` AND d.famille=$${i++}`; p.push(famille) }
  // un demandeur ne voit que ses demandes
  if (req.user.role < 2) { sql += ` AND d.demandeur_id=$${i++}`; p.push(req.user.id) }
  sql += ' ORDER BY d.date_creation DESC LIMIT 500'
  res.json(await many(sql, p))
}))

// Détail
r.get('/:id', wrap(async (req, res) => {
  const d = await one(`${LIST} WHERE d.id=$1`, [req.params.id])
  if (!d) return res.status(404).json({ error: 'Demande introuvable' })
  res.json(d)
}))

// Créer
r.post('/', wrap(async (req, res) => {
  const b = req.body
  const numero = await nextNumero()
  const champs = b.champs_supplementaires ? JSON.stringify(b.champs_supplementaires) : null
  const id = (await one(
    `INSERT INTO demandes (numero, demandeur_id, date_creation, date_objectif, outillage, description,
       famille, categorie, budget, doc_reference, priorite, champs_supplementaires, statut)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Nouvelle') RETURNING id`,
    [numero, req.user.id, now(), b.date_objectif, b.outillage, b.description,
     b.famille, b.categorie, b.budget, b.doc_reference, b.priorite || 'normale', champs]
  )).id
  await addHistorique(id, req.user.id, 'CRÉATION', { numero })
  await addAudit(req.user.id, req.user.nom_affiche, 'CRÉATION', { demande_id: id, numero })
  broadcast('demande', 'create', id)
  res.json(await one(`${LIST} WHERE d.id=$1`, [id]))
}))

// Valider (responsable+)
r.post('/:id/valider', requireRole(2), wrap(async (req, res) => {
  const b = req.body
  await pool.query(
    `UPDATE demandes SET statut='En cours', famille=$1, categorie=$2, assigne_a=$3,
       duree_estimee=$4, priorite=$5, date_objectif=$6, commentaire_validation=$7,
       validateur_id=$8, date_validation=$9
     WHERE id=$10 AND statut='Nouvelle'`,
    [b.famille, b.categorie, b.assigne_a, b.duree_estimee, b.priorite, b.date_objectif,
     b.commentaire, req.user.id, now(), req.params.id]
  )
  await addHistorique(req.params.id, req.user.id, 'VALIDATION', null)
  await addAudit(req.user.id, req.user.nom_affiche, 'VALIDATION', { demande_id: req.params.id })
  const d = await one('SELECT numero, outillage FROM demandes WHERE id=$1', [req.params.id])
  await notify(b.assigne_a, req.params.id, 'nouvelle_affectation', `Nouvelle demande affectée : ${d.outillage}`)
  broadcast('demande', 'update', Number(req.params.id))
  res.json({ ok: true })
}))

// Rejeter
r.post('/:id/rejeter', requireRole(2), wrap(async (req, res) => {
  const { motif } = req.body
  await pool.query(
    `UPDATE demandes SET statut='Rejetée', commentaire_validation=$1, validateur_id=$2, date_validation=$3
     WHERE id=$4 AND statut='Nouvelle'`,
    [motif, req.user.id, now(), req.params.id]
  )
  const d = await one('SELECT demandeur_id, numero FROM demandes WHERE id=$1', [req.params.id])
  await addHistorique(req.params.id, req.user.id, 'REJET', { motif })
  await notify(d.demandeur_id, req.params.id, 'rejetee', `Demande ${d.numero} rejetée : ${motif}`)
  broadcast('demande', 'update', Number(req.params.id))
  res.json({ ok: true })
}))

// Abandonner
r.post('/:id/abandonner', requireRole(2), wrap(async (req, res) => {
  await pool.query("UPDATE demandes SET statut='Abandonnée' WHERE id=$1", [req.params.id])
  await addHistorique(req.params.id, req.user.id, 'ABANDON', null)
  broadcast('demande', 'update', Number(req.params.id))
  res.json({ ok: true })
}))

// Mettre à jour l'avancement (technicien assigné)
r.post('/:id/avancement', requireRole(1), wrap(async (req, res) => {
  const { avancement, duree_realisee, travail_termine } = req.body
  if (travail_termine) {
    await pool.query(
      `UPDATE demandes SET avancement=100, duree_realisee=COALESCE($1,duree_realisee),
         statut='En attente de validation' WHERE id=$2`,
      [duree_realisee, req.params.id]
    )
    const d = await one('SELECT demandeur_id, numero, validateur_id FROM demandes WHERE id=$1', [req.params.id])
    await notify(d.demandeur_id, req.params.id, 'travail_termine', `Travail terminé sur ${d.numero}, à évaluer`)
  } else {
    await pool.query('UPDATE demandes SET avancement=$1 WHERE id=$2', [avancement, req.params.id])
  }
  await addHistorique(req.params.id, req.user.id, 'AVANCEMENT', { avancement })
  broadcast('demande', 'update', Number(req.params.id))
  res.json({ ok: true })
}))

// Évaluer / clôturer (demandeur)
r.post('/:id/evaluer', wrap(async (req, res) => {
  const { qualite, cout, delais } = req.body
  await pool.query(
    `UPDATE demandes SET satisfaction_qualite=$1, satisfaction_cout=$2, satisfaction_delais=$3,
       satisfaction_validee=1, statut='Clôturée', date_cloture=$4 WHERE id=$5`,
    [qualite, cout, delais, now(), req.params.id]
  )
  await addHistorique(req.params.id, req.user.id, 'CLÔTURE', { qualite, cout, delais })
  broadcast('demande', 'update', Number(req.params.id))
  res.json({ ok: true })
}))

// Modifier (responsable+)
r.put('/:id', requireRole(2), wrap(async (req, res) => {
  const b = req.body
  await pool.query(
    `UPDATE demandes SET outillage=$1, description=$2, date_objectif=$3, famille=$4,
       categorie=$5, priorite=$6, budget=$7, doc_reference=$8 WHERE id=$9`,
    [b.outillage, b.description, b.date_objectif, b.famille, b.categorie, b.priorite, b.budget, b.doc_reference, req.params.id]
  )
  await addHistorique(req.params.id, req.user.id, 'MODIFICATION', null)
  broadcast('demande', 'update', Number(req.params.id))
  res.json({ ok: true })
}))

export default r
