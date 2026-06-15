import { verifyToken } from './auth.js'

// Clients SSE connectés (objets `res` Express)
const clients = new Set()

/**
 * Diffuse un événement de mise à jour à tous les clients connectés.
 * @param {string} entity  'demande' | 'conge' | 'temps_masque' | …
 * @param {string} action  'create' | 'update' | 'delete'
 * @param {number} [id]    identifiant concerné (optionnel)
 */
export function broadcast(entity, action, id = null) {
  const data = JSON.stringify({ entity, action, id, t: Date.now() })
  for (const res of clients) {
    try { res.write(`data: ${data}\n\n`) } catch { /* client parti */ }
  }
}

/**
 * Handler Express pour l'endpoint SSE GET /api/events?token=…
 * (EventSource ne permet pas d'en-tête Authorization → token en query.)
 */
export function sseHandler(req, res) {
  const payload = verifyToken(req.query.token)
  if (!payload) {
    res.status(401).end()
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // désactive le buffering nginx
  })
  res.write('retry: 5000\n')
  res.write(': connecté\n\n')

  clients.add(res)

  // Ping régulier pour garder la connexion vivante (proxies)
  const ping = setInterval(() => {
    try { res.write(': ping\n\n') } catch { /* ignore */ }
  }, 25000)

  req.on('close', () => {
    clearInterval(ping)
    clients.delete(res)
  })
}

export function clientCount() {
  return clients.size
}
