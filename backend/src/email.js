import nodemailer from 'nodemailer'
import { getSettings } from './settings.js'

function transport(smtp) {
  if (!smtp?.host) return null
  return nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port) || 587,
    secure: !!smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })
}

/** Envoie un email. Silencieux si SMTP non configuré (ne bloque jamais une action métier). */
export async function sendMail(to, subject, html) {
  try {
    const { smtp } = await getSettings()
    const t = transport(smtp)
    if (!t || !to?.length) return false
    await t.sendMail({ from: smtp.from || smtp.user, to: Array.isArray(to) ? to.join(',') : to, subject, html })
    return true
  } catch (e) {
    console.warn('Email non envoyé :', e.message)
    return false
  }
}

/** Test de connexion SMTP. */
export async function testSmtp() {
  const { smtp } = await getSettings()
  const t = transport(smtp)
  if (!t) throw new Error('SMTP non configuré')
  await t.verify()
  return true
}

export async function notifyResponsables(subject, html) {
  const { smtp } = await getSettings()
  if (smtp?.responsables?.length) await sendMail(smtp.responsables, subject, html)
}
