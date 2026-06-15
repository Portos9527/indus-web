import bcrypt from 'bcryptjs'
import { pool, scalar, one } from './db.js'

/**
 * Crée le schéma complet d'INDUS (identique à la version desktop) + colonne
 * mot_de_passe pour l'authentification web. Idempotent (CREATE IF NOT EXISTS).
 */
export async function runMigrations() {
  // 1. Vérifier la connexion à PostgreSQL
  try {
    await pool.query('SELECT 1')
  } catch (e) {
    throw new Error(`Connexion PostgreSQL impossible (vérifiez DATABASE_URL) : ${e.message}`)
  }

  // 2. Détecter si la base est déjà structurée (table utilisateurs présente)
  const tablePresente = await scalar(
    "SELECT to_regclass('public.utilisateurs') IS NOT NULL"
  ).catch(() => false)

  if (tablePresente) {
    console.log('🔎 Base déjà structurée — vérification/maj du schéma…')
  } else {
    console.log('🆕 Base vide détectée — création automatique de toute la structure…')
  }

  const c = await pool.connect()
  try {
    await c.query('BEGIN')

    await c.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id                 SERIAL PRIMARY KEY,
        nom_session        TEXT UNIQUE NOT NULL,
        nom_affiche        TEXT NOT NULL,
        mot_de_passe       TEXT,
        role               INTEGER NOT NULL DEFAULT 0,
        initiales          TEXT,
        email              TEXT,
        actif              INTEGER NOT NULL DEFAULT 1,
        derniere_connexion TEXT,
        date_creation      TEXT NOT NULL
      )`)

    // Compatibilité : si la table vient de la version desktop, ajouter les
    // colonnes manquantes (mot_de_passe est spécifique au web).
    await c.query('ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mot_de_passe TEXT')

    await c.query(`
      CREATE TABLE IF NOT EXISTS demandes (
        id                       SERIAL PRIMARY KEY,
        numero                   TEXT UNIQUE NOT NULL,
        demandeur_id             INTEGER REFERENCES utilisateurs(id),
        date_creation            TEXT NOT NULL,
        date_objectif            TEXT NOT NULL,
        outillage                TEXT NOT NULL,
        description              TEXT NOT NULL,
        famille                  TEXT,
        categorie                TEXT,
        budget                   TEXT,
        doc_reference            TEXT,
        statut                   TEXT NOT NULL DEFAULT 'Nouvelle',
        priorite                 TEXT NOT NULL DEFAULT 'normale',
        assigne_a                INTEGER REFERENCES utilisateurs(id),
        date_prise_en_compte     TEXT,
        avancement               INTEGER NOT NULL DEFAULT 0,
        commentaire_validation   TEXT,
        duree_estimee            INTEGER,
        duree_realisee           INTEGER,
        validateur_id            INTEGER REFERENCES utilisateurs(id),
        date_validation          TEXT,
        satisfaction_qualite     INTEGER,
        satisfaction_cout        INTEGER,
        satisfaction_delais      INTEGER,
        satisfaction_validee     INTEGER NOT NULL DEFAULT 0,
        date_cloture             TEXT,
        champs_supplementaires   TEXT
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS pieces_jointes (
        id             SERIAL PRIMARY KEY,
        demande_id     INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
        nom_fichier    TEXT NOT NULL,
        chemin_relatif TEXT NOT NULL,
        date_ajout     TEXT NOT NULL,
        ajoute_par     INTEGER REFERENCES utilisateurs(id)
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS commentaires (
        id         SERIAL PRIMARY KEY,
        demande_id INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
        auteur_id  INTEGER REFERENCES utilisateurs(id),
        date       TEXT NOT NULL,
        texte      TEXT NOT NULL
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES utilisateurs(id),
        demande_id INTEGER REFERENCES demandes(id),
        type       TEXT NOT NULL,
        message    TEXT NOT NULL,
        lue        INTEGER NOT NULL DEFAULT 0,
        date       TEXT NOT NULL
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS historique (
        id         SERIAL PRIMARY KEY,
        demande_id INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
        user_id    INTEGER REFERENCES utilisateurs(id),
        date       TEXT NOT NULL,
        action     TEXT NOT NULL,
        details    TEXT
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS config (
        id     SERIAL PRIMARY KEY,
        type   TEXT NOT NULL,
        valeur TEXT NOT NULL,
        parent TEXT,
        ordre  INTEGER NOT NULL DEFAULT 0
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        timestamp   TEXT NOT NULL,
        user_id     INTEGER,
        utilisateur TEXT,
        action      TEXT NOT NULL,
        details     TEXT
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS conges (
        id            SERIAL PRIMARY KEY,
        technicien_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
        date_debut    TEXT NOT NULL,
        date_fin      TEXT NOT NULL,
        motif         TEXT,
        cree_par      INTEGER REFERENCES utilisateurs(id),
        date_creation TEXT NOT NULL
      )`)

    await c.query(`
      CREATE TABLE IF NOT EXISTS temps_masque (
        id            SERIAL PRIMARY KEY,
        demande_id    INTEGER NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
        date_debut    TEXT NOT NULL,
        date_fin      TEXT NOT NULL,
        motif         TEXT,
        cree_par      INTEGER REFERENCES utilisateurs(id),
        date_creation TEXT NOT NULL
      )`)

    // Index de performance
    const idx = [
      "CREATE INDEX IF NOT EXISTS idx_dem_statut    ON demandes(statut)",
      "CREATE INDEX IF NOT EXISTS idx_dem_demandeur ON demandes(demandeur_id)",
      "CREATE INDEX IF NOT EXISTS idx_dem_assigne   ON demandes(assigne_a)",
      "CREATE INDEX IF NOT EXISTS idx_dem_objectif  ON demandes(date_objectif)",
      "CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_conges_tech   ON conges(technicien_id)",
      "CREATE INDEX IF NOT EXISTS idx_tmasque_dem   ON temps_masque(demande_id)",
    ]
    for (const q of idx) await c.query(q)

    await c.query('COMMIT')
  } catch (e) {
    await c.query('ROLLBACK')
    throw e
  } finally {
    c.release()
  }

  await seedConfig()
  await seedAdmin()
}

const now = () => new Date().toISOString().slice(0, 19)

async function seedConfig() {
  const count = await scalar('SELECT COUNT(*) FROM config')
  if (Number(count) > 0) return
  const familles = ['Moules', 'Outillages', 'Impression 3D', 'Process / Automate / Equipements', 'Autre']
  for (let i = 0; i < familles.length; i++) {
    await pool.query("INSERT INTO config (type, valeur, parent, ordre) VALUES ('famille',$1,NULL,$2)", [familles[i], i])
  }
}

async function seedAdmin() {
  const login = process.env.ADMIN_LOGIN || 'admin'
  const pwd = process.env.ADMIN_PASSWORD || 'admin'
  const nom = process.env.ADMIN_NOM || 'Administrateur'
  const hash = await bcrypt.hash(pwd, 10)
  const initiales = nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const existant = await one('SELECT id, mot_de_passe FROM utilisateurs WHERE nom_session=$1', [login])

  if (existant) {
    // Le compte admin existe (ex. base desktop) : on lui pose un mot de passe s'il n'en a pas
    if (!existant.mot_de_passe) {
      await pool.query(
        'UPDATE utilisateurs SET mot_de_passe=$1, role=3, actif=1 WHERE id=$2',
        [hash, existant.id]
      )
      console.log(`🔑 Mot de passe défini pour le compte admin existant "${login}" (à changer)`)
    }
    return
  }

  // Aucun compte avec ce login → on le crée (que la base ait d'autres users ou non)
  await pool.query(
    `INSERT INTO utilisateurs (nom_session, nom_affiche, mot_de_passe, role, initiales, actif, date_creation)
     VALUES ($1,$2,$3,3,$4,1,$5)`,
    [login, nom, hash, initiales, now()]
  )
  const total = await scalar('SELECT COUNT(*) FROM utilisateurs')
  console.log(`👤 Compte admin "${login}" créé (${total} utilisateur(s) en base) — pensez à changer le mot de passe`)
}
