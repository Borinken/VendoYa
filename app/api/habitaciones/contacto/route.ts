import { NextResponse } from 'next/server'
import { mailConfigured, sendMail } from '@/lib/hab/mail'

export const runtime = 'nodejs'
const INBOX = 'admin@vendoya.es'
const hits = new Map<string, number[]>()
// shortcut: límite en memoria por instancia serverless, no global; pasar a KV/Upstash si hay abuso.
function limited(ip: string, now = Date.now()) {
  const l = (hits.get(ip) || []).filter(t => now - t < 3600_000)
  l.push(now); hits.set(ip, l)
  return l.length > 5
}
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '')

export async function POST(req: Request) {
  let b: Record<string, unknown>
  try { b = await req.json() } catch { return NextResponse.json({ ok: false, error: 'JSON no válido' }, { status: 400 }) }
  if (clean(b.web, 200)) return NextResponse.json({ ok: true }) // honeypot: bots reciben 200 sin envío
  const n = clean(b.n, 100), e = clean(b.e, 150), p = clean(b.p, 40), h = clean(b.h, 40)
  if (n.length < 2 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(e) || b.c !== true)
    return NextResponse.json({ ok: false, error: 'Revisa el nombre, el correo y la casilla de consentimiento.' }, { status: 400 })
  if (!mailConfigured()) return NextResponse.json({ ok: false, error: 'Envío de correo no configurado' }, { status: 503 })
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim()
  if (limited(ip)) return NextResponse.json({ ok: false, error: 'Demasiados intentos. Prueba más tarde.' }, { status: 429 })

  // Cuerpos en texto plano: no se interpreta HTML; nombre sin saltos de línea (anti-inyección de cabeceras).
  const aviso = await sendMail({ to: INBOX, replyTo: e, subject: `Nueva petición Habitaciones: ${n}`,
    text: `Nombre: ${n}\nCorreo: ${e}\nPerfil: ${p}\nHabitaciones: ${h}\nConsentimiento: sí\nIP: ${ip}` })
  if (!aviso.ok) return NextResponse.json({ ok: false, error: 'No hemos podido enviar tu mensaje. Escríbenos por WhatsApp.' }, { status: 502 })
  await sendMail({ to: e, replyTo: INBOX, subject: 'Hemos recibido tu mensaje · Vendoya Habitaciones',
    text: `Hola ${n}:\n\nHemos recibido tu mensaje y tu petición. Te respondemos en menos de 24 h laborables.\n\nSi necesitas añadir algo, responde a este correo.\n\nVendoya Habitaciones` })
  return NextResponse.json({ ok: true })
}
