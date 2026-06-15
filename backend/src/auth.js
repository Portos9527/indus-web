import jwt from 'jsonwebtoken'
import { one } from './db.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, login: user.nom_session, nom: user.nom_affiche },
    SECRET,
    { expiresIn: '12h' }
  )
}

/** Vérifie un token (chaîne) et renvoie le payload, ou null si invalide. */
export function verifyToken(token) {
  try { return jwt.verify(token, SECRET) } catch { return null }
}

/**
 * Middleware : vérifie le JWT et charge l'utilisateur frais depuis la base.
 * Le rôle vient TOUJOURS du serveur (jamais du client) → sécurité garantie.
 */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Non authentifié' })

  let payload
  try {
    payload = jwt.verify(token, SECRET)
  } catch {
    return res.status(401).json({ error: 'Session expirée, reconnectez-vous' })
  }

  const user = await one(
    'SELECT id, nom_session, nom_affiche, role, initiales, email, actif FROM utilisateurs WHERE id = $1',
    [payload.id]
  )
  if (!user || user.actif === 0) {
    return res.status(401).json({ error: 'Compte introuvable ou désactivé' })
  }
  req.user = user
  next()
}

/** Middleware : exige un rôle minimum (0=Demandeur, 1=Technicien, 2=Responsable, 3=Admin). */
export function requireRole(min) {
  return (req, res, next) => {
    if (!req.user || req.user.role < min) {
      return res.status(403).json({ error: 'Permission refusée' })
    }
    next()
  }
}
