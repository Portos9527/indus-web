import { Router } from 'express'
import { many, scalar } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { wrap } from '../helpers.js'

const r = Router()
r.use(authenticate)

const ACTIF = "statut NOT IN ('Clôturée','Rejetée','Abandonnée')"

// Tableau de bord global (responsable+)
r.get('/global', requireRole(2), wrap(async (req, res) => {
  const mois = Number(req.query.mois) || 3
  const since = `'${mois} months'`

  const ouvertes  = await scalar(`SELECT COUNT(*) FROM demandes WHERE ${ACTIF}`)
  const nouvelles = await scalar("SELECT COUNT(*) FROM demandes WHERE statut='Nouvelle'")
  const en_retard = await scalar(`SELECT COUNT(*) FROM demandes WHERE ${ACTIF} AND date_objectif < $1`, [new Date().toISOString().slice(0,10)])
  const urgentes  = await scalar(`SELECT COUNT(*) FROM demandes WHERE priorite='urgente' AND ${ACTIF}`)
  const total     = await scalar('SELECT COUNT(*) FROM demandes')
  const cloturees_periode = await scalar(
    `SELECT COUNT(*) FROM demandes WHERE statut='Clôturée' AND date_cloture >= (NOW() - INTERVAL ${since})::TEXT`)
  const delai_moyen = await scalar("SELECT AVG(duree_realisee::FLOAT) FROM demandes WHERE statut='Clôturée' AND duree_realisee IS NOT NULL")

  const respect = await many(
    `SELECT COUNT(*) FILTER (WHERE substring(date_cloture,1,10) <= substring(date_objectif,1,10)) AS a_temps,
            COUNT(*) AS total FROM demandes WHERE statut='Clôturée' AND date_cloture IS NOT NULL`)
  const taux_respect = respect[0].total > 0 ? Math.round((respect[0].a_temps * 100) / respect[0].total) : 100

  const par_statut = await many('SELECT statut, COUNT(*)::INT AS count FROM demandes GROUP BY statut ORDER BY count DESC')
  const par_priorite = await many('SELECT priorite, COUNT(*)::INT AS count FROM demandes GROUP BY priorite ORDER BY count DESC')
  const par_famille = await many("SELECT COALESCE(famille,'Non classé') AS famille, COUNT(*)::INT AS count FROM demandes GROUP BY famille ORDER BY count DESC")

  const charge_techniciens = await many(`
    SELECT u.nom_affiche AS nom, u.initiales, COUNT(d.id)::INT AS count
    FROM utilisateurs u
    LEFT JOIN demandes d ON d.assigne_a=u.id AND d.${ACTIF}
    WHERE u.role >= 1 AND u.actif = 1
    GROUP BY u.id, u.nom_affiche, u.initiales ORDER BY count DESC`)

  const perf_techniciens = await many(`
    SELECT u.nom_affiche AS nom, COUNT(d.id)::INT AS cloturees,
           AVG(d.duree_realisee) AS duree_moy,
           AVG(d.satisfaction_qualite::FLOAT) AS sat_qualite,
           AVG(d.satisfaction_cout::FLOAT) AS sat_cout,
           AVG(d.satisfaction_delais::FLOAT) AS sat_delais
    FROM utilisateurs u
    LEFT JOIN demandes d ON d.assigne_a=u.id AND d.statut='Clôturée'
    WHERE u.role >= 1 AND u.actif = 1
    GROUP BY u.id, u.nom_affiche ORDER BY cloturees DESC`)

  const urgentes_retard = await many(`
    SELECT d.id, d.numero, d.outillage, u.nom_affiche AS assigne_nom,
           EXTRACT(DAY FROM (NOW() - date_objectif::TIMESTAMP))::INT AS retard_jours
    FROM demandes d LEFT JOIN utilisateurs u ON u.id=d.assigne_a
    WHERE d.priorite='urgente' AND d.${ACTIF} AND d.date_objectif < $1
    ORDER BY retard_jours DESC LIMIT 20`, [new Date().toISOString().slice(0,10)])

  res.json({
    ouvertes: +ouvertes, nouvelles: +nouvelles, en_retard: +en_retard, urgentes: +urgentes,
    total: +total, cloturees_periode: +cloturees_periode,
    delai_moyen: delai_moyen ? +delai_moyen : null, taux_respect,
    par_statut, par_priorite, par_famille, charge_techniciens, perf_techniciens, urgentes_retard,
  })
}))

// Dashboard technicien
r.get('/tech', wrap(async (req, res) => {
  const id = req.user.id
  const en_cours = await scalar("SELECT COUNT(*) FROM demandes WHERE assigne_a=$1 AND statut='En cours'", [id])
  const cloturees_mois = await scalar(
    "SELECT COUNT(*) FROM demandes WHERE assigne_a=$1 AND statut='Clôturée' AND date_cloture >= (NOW()-INTERVAL '1 month')::TEXT", [id])
  const en_retard = await scalar(
    `SELECT COUNT(*) FROM demandes WHERE assigne_a=$1 AND ${ACTIF} AND date_objectif < $2`,
    [id, new Date().toISOString().slice(0,10)])
  res.json({ en_cours: +en_cours, cloturees_mois: +cloturees_mois, en_retard: +en_retard })
}))

export default r
