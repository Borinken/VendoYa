import { createHash, randomInt } from 'node:crypto'
import { buildSchedule } from './calc'
import { contractNumber } from './contract-form'
import { mailConfigured, sendMail } from './mail'
import { serviceClient } from './server-admin'
import { SIGN_CONSENT_TEXT, sealPdf, sha256Hex, type SealSigner } from './seal-pdf'
import type { SignInfo, SignInput, SignResult } from './types'

// Lógica de firma del servidor. Usa service_role (solo aquí y en las rutas /f y /d), siempre DESPUÉS de validar el token
// de un solo uso contra su hash. Firma electrónica simple: no cualificada.
const hash = (t: string) => createHash('sha256').update(t).digest('hex')
const valid = (t: string) => /^[0-9a-f]{64}$/.test(t)

async function findRequest(token: string) {
  if (!valid(token)) return null
  const sb = serviceClient()
  const { data } = await sb.from('hab_sign_requests').select('*').eq('token_hash', hash(token)).is('used_at', null).is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()
  return data as null | { id: string; contract_id: string; org_id: string; role: 'landlord' | 'tenant'; signer_name: string; signer_email: string; code_hash: string | null; code_expires_at: string | null }
}

export async function signInfo(token: string): Promise<SignInfo | null> {
  const req = await findRequest(token); if (!req) return null
  const sb = serviceClient()
  const { data: c } = await sb.from('hab_contracts').select('room_id, shared_pdf_path').eq('id', req.contract_id).single()
  if (!c?.shared_pdf_path) return null
  const [{ data: room }, { data: org }, { count }] = await Promise.all([
    sb.from('hab_rooms').select('label, property_id').eq('id', c.room_id).single(), sb.from('hab_orgs').select('name').eq('id', req.org_id).single(),
    sb.from('hab_signatures').select('id', { count: 'exact', head: true }).eq('contract_id', req.contract_id)])
  const { data: prop } = await sb.from('hab_properties').select('name').eq('id', room?.property_id).single()
  return { request_id: req.id, contract_id: req.contract_id, role: req.role, signer_name: req.signer_name, contract_title: `${room?.label ?? ''} · ${prop?.name ?? ''}`, org_name: org?.name ?? '', mail_enabled: mailConfigured(), already_signed_by_other: (count ?? 0) > 0 }
}

export async function signPdfUrl(token: string): Promise<string | null> {
  const req = await findRequest(token); if (!req) return null
  const sb = serviceClient(); const { data: c } = await sb.from('hab_contracts').select('shared_pdf_path').eq('id', req.contract_id).single()
  if (!c?.shared_pdf_path) return null
  const { data } = await sb.storage.from('hab-docs').createSignedUrl(c.shared_pdf_path, 120)
  return data?.signedUrl ?? null
}

// Envía un código de 6 dígitos al email del firmante (solo si hay Resend configurado).
export async function sendCode(token: string): Promise<{ ok: boolean; error?: string }> {
  const req = await findRequest(token); if (!req) return { ok: false, error: 'Enlace no válido o caducado' }
  if (!mailConfigured() || !req.signer_email) return { ok: false, error: 'El envío de códigos por email no está disponible' }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0'); const sb = serviceClient()
  await sb.from('hab_sign_requests').update({ code_hash: hash(code), code_expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }).eq('id', req.id)
  const r = await sendMail({ to: req.signer_email, subject: 'Tu código para firmar el contrato', text: `Tu código de firma es ${code}. Caduca en 10 minutos. Mensaje automático de Vendoya Habitaciones.` })
  await sb.from('hab_mail_log').insert({ contract_id: req.contract_id, to_role: req.role, kind: 'code', status: r.ok ? 'sent' : 'failed', attempts: r.attempts })
  return { ok: r.ok, error: r.ok ? undefined : 'No se pudo enviar el código' }
}

export async function recordSignature(token: string, input: SignInput & { code?: string }, ip: string, ua: string): Promise<SignResult> {
  const req = await findRequest(token); if (!req) throw new Error('Enlace no válido, usado o caducado')
  const sb = serviceClient(); const withCode = mailConfigured() && !!req.signer_email
  if (withCode) {
    if (!input.code || !req.code_hash || !req.code_expires_at || new Date(req.code_expires_at) < new Date() || hash(input.code) !== req.code_hash) throw new Error('Código incorrecto o caducado')
  }
  const { data: c } = await sb.from('hab_contracts').select('*').eq('id', req.contract_id).single()
  if (!c?.shared_pdf_path) throw new Error('El contrato no tiene PDF')
  const orig = await sb.storage.from('hab-docs').download(c.shared_pdf_path); if (orig.error || !orig.data) throw new Error('No se pudo leer el contrato')
  const bytes = new Uint8Array(await orig.data.arrayBuffer()); const docHash = await sha256Hex(bytes)
  const png = Buffer.from(input.signature.split(',')[1], 'base64'); const sigPath = `${req.org_id}/signatures/${req.contract_id}/${req.id}.png`
  const up = await sb.storage.from('hab-docs').upload(sigPath, png, { contentType: 'image/png', upsert: true }); if (up.error) throw new Error('No se pudo guardar la firma')
  const { error } = await sb.from('hab_signatures').insert({ contract_id: req.contract_id, request_id: req.id, role: req.role, signer_name: input.name, ip, user_agent: ua.slice(0, 300), doc_hash: docHash, signature_path: sigPath, method: withCode ? 'link_code' : 'link', consent_text: SIGN_CONSENT_TEXT })
  if (error) throw new Error('No se pudo registrar la firma')
  await sb.from('hab_sign_requests').update({ used_at: new Date().toISOString(), signer_name: input.name }).eq('id', req.id)

  const { data: reqs } = await sb.from('hab_sign_requests').select('id, role, signer_email, used_at').eq('contract_id', req.contract_id).is('revoked_at', null)
  const all = (reqs ?? []).length > 0 && (reqs ?? []).every(r => r.used_at)
  const dl = await newDownload(req.contract_id)
  if (!all) return { all_signed: false, download_token: dl }

  // Última firma: sellado, activación del contrato y envío a las partes (un fallo de email no bloquea nada).
  const { data: sigs } = await sb.from('hab_signatures').select('*').eq('contract_id', req.contract_id).order('signed_at')
  const signers: SealSigner[] = []
  for (const s of sigs ?? []) {
    const f = s.signature_path ? await sb.storage.from('hab-docs').download(s.signature_path) : null
    signers.push({ role: s.role, name: s.signer_name, signedAt: s.signed_at, ip: s.ip ?? '', userAgent: s.user_agent ?? '', method: s.method, png: f?.data ? new Uint8Array(await f.data.arrayBuffer()) : null })
  }
  const sealed = await sealPdf(bytes, signers, docHash, contractNumber(c.id, c.starts_on))
  const sealedPath = `${req.org_id}/contracts/${req.contract_id}/sellado-${Date.now()}.pdf`
  const su = await sb.storage.from('hab-docs').upload(sealedPath, sealed, { contentType: 'application/pdf', upsert: false }); if (su.error) throw new Error('No se pudo guardar el contrato sellado')
  await sb.from('hab_contracts').update({ sealed_pdf_path: sealedPath, signed_pdf_path: sealedPath, signed_at: new Date().toISOString(), status: 'active' }).eq('id', req.contract_id)
  await sb.from('hab_rooms').update({ status: 'occupied' }).eq('id', c.room_id)
  const { data: pays } = await sb.from('hab_payments').select('id').eq('contract_id', c.id).limit(1)
  if (!pays?.length) await sb.from('hab_payments').insert(buildSchedule(c.starts_on, c.ends_on, c.rent_cents).map(p => ({ contract_id: c.id, ...p, status: p.due_on < new Date().toISOString().slice(0, 10) ? 'late' : 'pending' })))
  await notifyParties(req.contract_id, req.org_id, sealed, signers, reqs ?? [])
  return { all_signed: true, download_token: dl }
}

async function newDownload(contractId: string): Promise<string> {
  const tok = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
  await serviceClient().from('hab_contract_downloads').insert({ contract_id: contractId, token_hash: hash(tok), expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() })
  return tok
}

async function notifyParties(contractId: string, orgId: string, sealed: Uint8Array, signers: SealSigner[], reqs: { role: string; signer_email: string }[]) {
  if (!mailConfigured()) return
  const sb = serviceClient(); const { data: st } = await sb.from('hab_org_settings').select('auto_email_copy').eq('org_id', orgId).maybeSingle()
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vendoya.es').replace(/\/$/, '')
  const who = signers.map(s => `${s.name} (${s.role === 'landlord' ? 'arrendador' : 'arrendatario'})`).join(' y ')
  const when = signers.length ? new Date(signers[signers.length - 1].signedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : ''
  for (const r of reqs) {
    if (!r.signer_email) continue
    if (r.role === 'landlord' && !st?.auto_email_copy) continue // la copia al propietario es opcional (Ajustes)
    const link = `${base}/habitaciones/d/${await newDownload(contractId)}`
    const text = `Hola,\n\nEl contrato ha sido firmado por ${who} el ${when}.\n\nPuedes descargarlo aquí (el enlace caduca a los 30 días): ${link}\n\nSe firmó con firma electrónica simple (Reglamento UE 910/2014, art. 25); no es firma cualificada.\n\nEste mensaje es automático.`
    const res = await sendMail({ to: r.signer_email, subject: 'Contrato firmado', text, attachment: sealed.byteLength < 5 * 1024 * 1024 ? { filename: 'contrato-firmado.pdf', bytes: sealed } : undefined })
    await sb.from('hab_mail_log').insert({ contract_id: contractId, to_role: r.role, kind: 'sealed', status: res.ok ? 'sent' : 'failed', attempts: res.attempts })
  }
}

// Enlace de descarga de solo lectura: devuelve una URL firmada del PDF sellado (o del original si aún no está sellado).
export async function downloadUrl(token: string): Promise<string | null> {
  if (!valid(token)) return null
  const sb = serviceClient()
  const { data: d } = await sb.from('hab_contract_downloads').select('contract_id').eq('token_hash', hash(token)).is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (!d) return null
  const { data: c } = await sb.from('hab_contracts').select('sealed_pdf_path, shared_pdf_path').eq('id', d.contract_id).single()
  const path = c?.sealed_pdf_path ?? c?.shared_pdf_path; if (!path) return null
  const { data } = await sb.storage.from('hab-docs').createSignedUrl(path, 60, { download: 'contrato.pdf' })
  return data?.signedUrl ?? null
}
