import { Router } from 'express'
import express from 'express'
import { SAML } from '@node-saml/node-saml'
import { one } from '../db.js'
import { signToken } from '../auth.js'
import { now, wrap } from '../helpers.js'

// ── Configuration depuis l'environnement ──
const CFG = {
  entryPoint: process.env.SAML_ENTRY_POINT || '',      // URL SSO de l'IdP (SOLCERA)
  issuer: process.env.SAML_ISSUER || 'indus-web',       // entityID du SP (notre app)
  callbackUrl: process.env.SAML_CALLBACK_URL || '',     // notre ACS (https://…/api/auth/saml/acs)
  idpCert: (process.env.SAML_CERT || '').replace(/\\n/g, '\n'), // certif x509 de l'IdP
  logoutUrl: process.env.SAML_LOGOUT_URL || '',
}
const APP_URL = process.env.APP_URL || process.env.CORS_ORIGIN || ''
const ATTR_LOGIN = process.env.SAML_ATTR_LOGIN || ''   // attribut identifiant (sinon nameID)
const ATTR_NOM = process.env.SAML_ATTR_NOM || 'displayName'
const ATTR_MAIL = process.env.SAML_ATTR_MAIL || 'email'

export function samlEnabled() {
  return !!(CFG.entryPoint && CFG.idpCert && CFG.callbackUrl)
}

function makeSaml() {
  return new SAML({
    entryPoint: CFG.entryPoint,
    issuer: CFG.issuer,
    callbackUrl: CFG.callbackUrl,
    idpCert: CFG.idpCert,
    logoutUrl: CFG.logoutUrl || undefined,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    disableRequestedAuthnContext: true,
    signatureAlgorithm: 'sha256',
  })
}

const r = Router()

// Le frontend interroge ceci pour afficher (ou non) le bouton SSO
r.get('/auth/saml/enabled', (req, res) => res.json({ enabled: samlEnabled() }))

// Métadonnées du SP (à transmettre à l'IT pour déclarer notre app dans l'IdP)
r.get('/auth/saml/metadata', wrap(async (req, res) => {
  if (!samlEnabled()) return res.status(404).send('SAML non configuré')
  const xml = makeSaml().generateServiceProviderMetadata(null, null)
  res.type('application/xml').send(xml)
}))

// 1) Démarrage : redirige vers l'IdP
r.get('/auth/saml/login', wrap(async (req, res) => {
  if (!samlEnabled()) return res.status(503).json({ error: 'SSO non configuré' })
  const url = await makeSaml().getAuthorizeUrlAsync('', null, {})
  res.redirect(url)
}))

// 2) ACS : l'IdP poste l'assertion ici → on valide, on (dé)provisionne, on émet notre JWT
r.post('/auth/saml/acs', express.urlencoded({ extended: false, limit: '2mb' }), wrap(async (req, res) => {
  if (!samlEnabled()) return res.status(503).send('SSO non configuré')
  let profile
  try {
    ({ profile } = await makeSaml().validatePostResponseAsync(req.body))
  } catch (e) {
    return res.redirect(`${APP_URL}/#/login?sso_error=${encodeURIComponent('Assertion SAML invalide')}`)
  }
  const at = profile.attributes || {}
  const login = String((ATTR_LOGIN && at[ATTR_LOGIN]) || profile.nameID || '').trim()
  if (!login) return res.redirect(`${APP_URL}/#/login?sso_error=identifiant_absent`)
  const nom = at[ATTR_NOM] || login
  const email = at[ATTR_MAIL] || (String(login).includes('@') ? login : null)

  // Upsert : retrouve par nom_session, sinon crée (rôle Demandeur par défaut)
  let u = await one('SELECT * FROM utilisateurs WHERE nom_session=$1', [login])
  if (!u) {
    const initiales = String(nom).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    u = await one(
      `INSERT INTO utilisateurs (nom_session, nom_affiche, role, initiales, email, actif, date_creation)
       VALUES ($1,$2,0,$3,$4,1,$5) RETURNING *`,
      [login, nom, initiales, email, now()]
    )
  }
  if (u.actif === 0) return res.redirect(`${APP_URL}/#/login?sso_error=compte_desactive`)

  await one('UPDATE utilisateurs SET derniere_connexion=$1 WHERE id=$2 RETURNING id', [now(), u.id])
  const token = signToken(u)
  res.redirect(`${APP_URL}/#/sso?token=${encodeURIComponent(token)}`)
}))

export default r
