import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { many, scalar, pool } from '../db.js'
import { authenticate, requireRole } from '../auth.js'
import { wrap } from '../helpers.js'
import { getSettings, saveSettings } from '../settings.js'
import { testSmtp } from '../email.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')

const r = Router()
r.use(authenticate)

// ── Paramètres (SMTP, SLA, permissions) ── role 3
r.get('/settings', requireRole(3), wrap(async (req, res) => {
  const s = await getSettings()
  if (s.smtp) s.smtp = { ...s.smtp, pass: s.smtp.pass ? '••••••' : '' } // masque
  res.json(s)
}))

r.put('/settings', requireRole(3), wrap(async (req, res) => {
  const patch = req.body || {}
  // ne pas écraser le mot de passe SMTP par le masque
  if (patch.smtp && (patch.smtp.pass === '••••••' || patch.smtp.pass === undefined)) {
    const cur = await getSettings()
    patch.smtp.pass = cur.smtp?.pass || ''
  }
  res.json(await saveSettings(patch))
}))

r.post('/smtp-test', requireRole(3), wrap(async (req, res) => {
  await testSmtp()
  res.json({ ok: true, message: 'Connexion SMTP réussie' })
}))

// ── Diagnostic système ── role 3
r.get('/diagnostics', requireRole(3), wrap(async (req, res) => {
  const out = []
  const t0 = Date.now()
  try { await pool.query('SELECT 1'); const ms = Date.now() - t0
    out.push({ key: 'db', name: 'Base de données', status: ms < 300 ? 'ok' : 'warn', detail: `Réponse en ${ms} ms`, ms })
  } catch (e) { out.push({ key: 'db', name: 'Base de données', status: 'ko', detail: e.message }) }
  try { const v = await scalar('SELECT version()'); out.push({ key: 'pg', name: 'Moteur PostgreSQL', status: 'ok', detail: String(v).split(' on ')[0] }) } catch {}
  try {
    const u = await scalar('SELECT COUNT(*) FROM utilisateurs'); const d = await scalar('SELECT COUNT(*) FROM demandes')
    out.push({ key: 'tables', name: 'Données', status: 'ok', detail: `${u} utilisateur(s), ${d} demande(s)` })
  } catch (e) { out.push({ key: 'tables', name: 'Données', status: 'ko', detail: e.message }) }
  // écriture
  try { await pool.query('BEGIN'); await pool.query('CREATE TEMP TABLE _diag(x int) ON COMMIT DROP'); await pool.query('ROLLBACK')
    out.push({ key: 'write', name: 'Écriture base', status: 'ok', detail: 'OK' }) } catch (e) { out.push({ key: 'write', name: 'Écriture base', status: 'ko', detail: e.message }) }
  // dossier pièces jointes
  try { const test = path.join(UPLOAD_DIR, '.diag'); fs.writeFileSync(test, 'x'); fs.unlinkSync(test)
    out.push({ key: 'uploads', name: 'Dossier pièces jointes', status: 'ok', detail: UPLOAD_DIR }) }
  catch (e) { out.push({ key: 'uploads', name: 'Dossier pièces jointes', status: 'warn', detail: e.message }) }
  // SMTP
  const s = await getSettings()
  out.push({ key: 'smtp', name: 'Email (SMTP)', status: s.smtp?.host ? 'ok' : 'warn', detail: s.smtp?.host ? `Serveur ${s.smtp.host}` : 'Non configuré' })
  res.json(out)
}))

// ── Console SQL lecture seule ── role 3
r.post('/sql', requireRole(3), wrap(async (req, res) => {
  const sql = (req.body?.sql || '').trim().replace(/;+\s*$/, '')
  const low = sql.toLowerCase()
  if (!low.startsWith('select') && !low.startsWith('with')) return res.status(400).json({ error: 'Seules les requêtes SELECT / WITH sont autorisées' })
  const c = await pool.connect()
  try {
    await c.query('BEGIN TRANSACTION READ ONLY')
    const rows = (await c.query(`SELECT to_jsonb(t) AS row FROM (${sql}) t LIMIT 500`)).rows.map(r => r.row)
    await c.query('ROLLBACK')
    res.json({ rows, count: rows.length })
  } catch (e) { try { await c.query('ROLLBACK') } catch {} ; res.status(400).json({ error: e.message }) }
  finally { c.release() }
}))

// ── Export CSV des demandes ── role 2
r.get('/export', requireRole(2), wrap(async (req, res) => {
  const rows = await many(`
    SELECT d.numero, d.date_creation, d.date_objectif, d.priorite, d.outillage, d.famille, d.categorie,
           ud.nom_affiche AS demandeur, ua.nom_affiche AS assigne, d.statut, d.avancement,
           d.date_cloture, d.satisfaction_qualite, d.satisfaction_cout, d.satisfaction_delais
    FROM demandes d
    LEFT JOIN utilisateurs ud ON ud.id=d.demandeur_id
    LEFT JOIN utilisateurs ua ON ua.id=d.assigne_a
    ORDER BY d.id`)
  const head = ['Numéro','Création','Objectif','Priorité','Sujet','Famille','Catégorie','Demandeur','Assigné','Statut','Avancement','Clôture','Qualité','Coût','Délais']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.join(';'), ...rows.map(r => [r.numero,r.date_creation,r.date_objectif,r.priorite,r.outillage,r.famille,r.categorie,r.demandeur,r.assigne,r.statut,r.avancement,r.date_cloture,r.satisfaction_qualite,r.satisfaction_cout,r.satisfaction_delais].map(esc).join(';'))]
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="INDUS_export_${new Date().toISOString().slice(0,10)}.csv"`)
  res.send('﻿' + lines.join('\r\n'))
}))

// ════════ ESPACE ÉDITEUR (role 4) : explorateur/éditeur de tables ════════
const TABLES = ['utilisateurs','demandes','commentaires','notifications','pieces_jointes','historique','config','audit_log','conges','temps_masque']
const okTable = (t) => TABLES.includes(t)

r.get('/tables', requireRole(4), wrap(async (req, res) => {
  const out = []
  for (const t of TABLES) { const c = await scalar(`SELECT COUNT(*) FROM "${t}"`).catch(() => 0); out.push({ name: t, count: Number(c) }) }
  res.json(out)
}))

r.get('/table/:t', requireRole(4), wrap(async (req, res) => {
  const t = req.params.t; if (!okTable(t)) return res.status(400).json({ error: 'Table non autorisée' })
  const cols = await many(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])
  const total = Number(await scalar(`SELECT COUNT(*) FROM "${t}"`))
  const limit = Math.min(200, Number(req.query.limit) || 50)
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const rows = (await many(`SELECT to_jsonb(x) AS row FROM "${t}" x ORDER BY 1 LIMIT $1 OFFSET $2`, [limit, offset])).map(r => r.row)
  res.json({ columns: cols.map(c => c.column_name), rows, total })
}))

r.put('/table/:t', requireRole(4), wrap(async (req, res) => {
  const t = req.params.t; if (!okTable(t)) return res.status(400).json({ error: 'Table non autorisée' })
  const cols = (await many(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t])).map(c => c.column_name)
  if (!cols.includes('id')) return res.status(400).json({ error: "Table sans colonne 'id'" })
  const set = cols.map(c => `"${c}"=rec."${c}"`).join(', ')
  const sql = `WITH rec AS (SELECT * FROM jsonb_populate_record(NULL::"${t}", $1::jsonb)) UPDATE "${t}" o SET ${set} FROM rec WHERE o."id"=rec."id"`
  const result = await pool.query(sql, [JSON.stringify(req.body)])
  if (!result.rowCount) return res.status(404).json({ error: 'Ligne introuvable (id)' })
  res.json({ ok: true })
}))

r.delete('/table/:t/:id', requireRole(4), wrap(async (req, res) => {
  const t = req.params.t; if (!okTable(t)) return res.status(400).json({ error: 'Table non autorisée' })
  await pool.query(`DELETE FROM "${t}" WHERE id=$1`, [req.params.id])
  res.json({ ok: true })
}))

export default r
