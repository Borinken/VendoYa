// Envío de email con Resend por fetch directo (sin dependencia nueva). Solo servidor. Las claves salen del entorno.
export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.HAB_MAIL_FROM

export interface MailInput { to: string; replyTo?: string; subject: string; text: string; attachment?: { filename: string; bytes: Uint8Array } }

// Devuelve { ok, attempts }. Reintenta una vez. Nunca lanza: un fallo de email no debe bloquear la firma.
export async function sendMail(m: MailInput): Promise<{ ok: boolean; attempts: number }> {
  if (!mailConfigured() || !m.to) return { ok: false, attempts: 0 }
  const body = JSON.stringify({
    from: process.env.HAB_MAIL_FROM, to: [m.to], ...(m.replyTo ? { reply_to: m.replyTo } : {}), subject: m.subject, text: m.text,
    ...(m.attachment ? { attachments: [{ filename: m.attachment.filename, content: Buffer.from(m.attachment.bytes).toString('base64') }] } : {}),
  })
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body })
      if (r.ok) return { ok: true, attempts: attempt }
    } catch { /* reintenta */ }
  }
  return { ok: false, attempts: 2 }
}
