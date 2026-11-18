// Sellado del PDF con firmas: añade una hoja de firmas y un «Certificado de firma». Se ejecuta en el servidor (flujo real)
// y en el navegador (demo). Firma electrónica SIMPLE: no es cualificada; no se presenta como validada por terceros.
export const SIGN_LEGAL_TEXT = 'Firma electrónica simple (Reglamento UE 910/2014, art. 25). No es firma cualificada. Valor probatorio sujeto a valoración judicial.'
export const SIGN_CONSENT_TEXT = 'He leído el contrato y acepto sus condiciones. Entiendo que firmo con una firma electrónica simple (no cualificada) y que se guardarán mi nombre, la fecha y hora, mi IP y mi navegador como evidencia.'
export const SIGN_LAWYER_NOTE = 'Flujo de firma pendiente de revisión por abogado.'

export interface SealSigner { role: 'landlord' | 'tenant'; name: string; signedAt: string; ip: string; userAgent: string; method: string; png: Uint8Array | null }

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const safe = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^ -~ -ÿ€–—•…]/g, '?')
const ROLE = { landlord: 'Parte arrendadora', tenant: 'Parte arrendataria' } as const

export async function sealPdf(original: Uint8Array, signers: SealSigner[], docHash: string, number: string): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.load(original)
  const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const W = 595.28, H = 841.89, M = 56; const ink = rgb(0.1, 0.1, 0.1); const grey = rgb(0.4, 0.4, 0.4)
  const wrap = (t: string, f: typeof font, size: number, width: number) => {
    const out: string[] = []; let cur = ''
    for (const w of safe(t).split(/\s+/)) { const x = cur ? cur + ' ' + w : w; if (f.widthOfTextAtSize(x, size) > width && cur) { out.push(cur); cur = w } else cur = x }
    if (cur) out.push(cur); return out
  }
  // Hoja de firmas
  let page = doc.addPage([W, H]); let y = H - M - 20
  page.drawText(`Hoja de firmas · Contrato ${safe(number)}`, { x: M, y, size: 15, font: bold, color: ink }); y -= 34
  for (const s of signers) {
    if (y < 200) { page = doc.addPage([W, H]); y = H - M - 20 }
    page.drawText(ROLE[s.role], { x: M, y, size: 10, font, color: grey }); y -= 15
    page.drawText(safe(s.name), { x: M, y, size: 12, font: bold, color: ink }); y -= 8
    if (s.png) { const img = await doc.embedPng(s.png); const k = Math.min(220 / img.width, 90 / img.height); page.drawImage(img, { x: M, y: y - img.height * k - 4, width: img.width * k, height: img.height * k }); y -= img.height * k + 8 }
    page.drawLine({ start: { x: M, y: y - 2 }, end: { x: M + 240, y: y - 2 }, thickness: 0.6, color: ink }); y -= 14
    page.drawText(`Firmado el ${new Date(s.signedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC`, { x: M, y, size: 9, font, color: grey }); y -= 38
  }
  // Certificado de firma
  page = doc.addPage([W, H]); y = H - M - 20
  page.drawText('Certificado de firma', { x: M, y, size: 17, font: bold, color: ink }); y -= 26
  const para = (t: string, o: { f?: typeof font; size?: number; gap?: number } = {}) => { for (const l of wrap(t, o.f ?? font, o.size ?? 10, W - 2 * M)) { page.drawText(l, { x: M, y, size: o.size ?? 10, font: o.f ?? font, color: ink }); y -= (o.size ?? 10) * 1.5 } y -= o.gap ?? 4 }
  para(SIGN_LEGAL_TEXT, { f: bold, gap: 8 })
  para(`Contrato n.º ${number}`)
  para(`Hash SHA-256 del documento firmado (antes de añadir esta hoja): ${docHash}`, { gap: 10 })
  signers.forEach((s, i) => {
    para(`${i + 1}. ${ROLE[s.role]}: ${s.name}`, { f: bold, gap: 1 })
    para(`Fecha y hora (UTC): ${new Date(s.signedAt).toISOString()}`, { gap: 1 })
    para(`IP: ${s.ip || 'no disponible'}`, { gap: 1 })
    para(`Navegador: ${s.userAgent || 'no disponible'}`, { gap: 1 })
    para(`Método: ${s.method === 'link_code' ? 'enlace único + código de 6 dígitos por email' : 'enlace único + consentimiento'}`, { gap: 8 })
  })
  para(SIGN_LAWYER_NOTE, { size: 9, gap: 2 })
  para('Documento generado automáticamente por Vendoya Habitaciones. No es asesoría jurídica.', { size: 9 })
  return doc.save()
}
