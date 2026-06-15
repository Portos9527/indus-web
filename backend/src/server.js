import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { runMigrations } from './migrations.js'
import { sseHandler, clientCount } from './events.js'
import authRoutes from './routes/auth.js'
import demandesRoutes from './routes/demandes.js'
import usersRoutes from './routes/users.js'
import congesRoutes from './routes/conges.js'
import tempsMasqueRoutes from './routes/tempsMasque.js'
import planDeChargeRoutes from './routes/planDeCharge.js'
import dashboardRoutes from './routes/dashboard.js'
import configRoutes from './routes/config.js'
import miscRoutes from './routes/misc.js'

dotenv.config()

const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))
app.use(express.json({ limit: '2mb' }))

// Santé
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'INDUS API', clients: clientCount(), time: new Date().toISOString() }))

// Flux temps réel (Server-Sent Events)
app.get('/api/events', sseHandler)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/demandes', demandesRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/conges', congesRoutes)
app.use('/api/temps-masque', tempsMasqueRoutes)
app.use('/api/plan-de-charge', planDeChargeRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/config', configRoutes)
app.use('/api', miscRoutes)

// 404 API
app.use('/api', (req, res) => res.status(404).json({ error: 'Route introuvable' }))

const PORT = process.env.PORT || 3001

async function start() {
  try {
    console.log('⏳ Initialisation de la base de données…')
    await runMigrations()
    console.log('✅ Base de données prête')
    app.listen(PORT, () => console.log(`🚀 API INDUS démarrée sur http://localhost:${PORT}`))
  } catch (e) {
    console.error('❌ Échec du démarrage :', e.message)
    process.exit(1)
  }
}

start()
