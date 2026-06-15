import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant dans .env')
  process.exit(1)
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('Erreur inattendue du pool PostgreSQL :', err.message)
})

// Helper requête simplifié
export async function query(text, params) {
  return pool.query(text, params)
}

// Renvoie une seule ligne (ou null)
export async function one(text, params) {
  const r = await pool.query(text, params)
  return r.rows[0] || null
}

// Renvoie toutes les lignes
export async function many(text, params) {
  const r = await pool.query(text, params)
  return r.rows
}

// Renvoie une seule valeur scalaire
export async function scalar(text, params) {
  const r = await pool.query(text, params)
  return r.rows[0] ? Object.values(r.rows[0])[0] : null
}
