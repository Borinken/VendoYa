import type { PDFFont, PDFPage } from 'pdf-lib'
import type { ContractDraft } from './contract-form'
import { WATERMARK_TEXT } from './contract-form'
import { describeConditions, type CondValues } from './conditions'
import type { ContractClause } from './types'

export interface PdfPhoto { bytes: Uint8Array; caption: string; date: string }
export interface PdfInput {
  number: string; draft: ContractDraft; clauses: ContractClause[]; conditions: CondValues; watermark: boolean
  photos: PdfPhoto[]; keysActs: boolean; custodyNote: string
}

const W = 595.28, H = 841.89, M = 56
const eur = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
const dateEs = (d: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '________')
// Helvetica (WinAnsi) no admite todos los caracteres: se sustituyen los que no caben.
const safe = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[→]/g, '->').replace(/[≥]/g, '>=').replace(/[^ -~ -ÿ€–—•…]/g, '?')
const COND = { ok: 'En buen estado', worn: 'Desgastado', damaged: 'Dañado' } as const

// PDF A4 generado en el navegador con pdf-lib (sin servicios externos). Se importa de forma diferida.
export async function buildContractPdf(i: PdfInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page: PDFPage = doc.addPage([W, H]); let y = H - M - 20
  const pages: PDFPage[] = [page]
  const ink = rgb(0.1, 0.1, 0.1); const grey = rgb(0.4, 0.4, 0.4)
  const newPage = () => { page = doc.addPage([W, H]); pages.push(page); y = H - M - 20 }
  const need = (h: number) => { if (y - h < M + 24) newPage() }
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
    const lines: string[] = []
    for (const para of safe(text).split('\n')) {
      let cur = ''
      for (const w of para.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (f.widthOfTextAtSize(t, size) > width && cur) { lines.push(cur); cur = w } else cur = t }
      lines.push(cur)
    }
    return lines
  }
  const para = (text: string, o: { size?: number; f?: PDFFont; gap?: number; indent?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const size = o.size ?? 10.5; const f = o.f ?? font
    for (const l of wrap(text, f, size, W - 2 * M - (o.indent ?? 0))) { need(size * 1.45); page.drawText(l, { x: M + (o.indent ?? 0), y, size, font: f, color: o.color ?? ink }); y -= size * 1.45 }
    y -= o.gap ?? 4
  }
  const h = (text: string) => { need(30); y -= 8; page.drawText(safe(text), { x: M, y, size: 12, font: bold, color: ink }); y -= 18 }
  const d = i.draft

  page.drawText('CONTRATO DE ARRENDAMIENTO DE HABITACIÓN', { x: M, y, size: 16, font: bold, color: ink }); y -= 26
  para(`Contrato n.º ${i.number}. En ${d.place}, a ${dateEs(d.signDate)}.`, { color: grey })
  h('Reunidos')
  para(`De una parte, ${d.landlord.name}, con identificación ${d.landlord.taxId} y domicilio en ${d.landlord.address} (contacto: ${d.landlord.contact}), en adelante la parte arrendadora.`)
  para(`De otra parte, ${d.tenant.name}, con identificación ${d.tenant.taxId}, domicilio en ${d.tenant.address}, teléfono ${d.tenant.phone} y correo ${d.tenant.email}, en adelante la parte arrendataria.`)
  h('Inmueble')
  para(`Se arrienda ${d.property.roomLabel === 'Piso entero' ? `el piso completo (${d.property.sizeM2} m²), inmueble sito en` : `la habitación «${d.property.roomLabel}» (${d.property.sizeM2} m²) del inmueble sito en`} ${d.property.address}${d.property.cadastral ? `, referencia catastral ${d.property.cadastral}` : ''}. Zonas comunes de uso: ${d.property.commonAreas}.`)
  let n = 1
  const clause = (title: string, body: string) => { h(`${n++}. ${title}`); para(body) }
  clause('Duración', `Desde el ${dateEs(d.term.startsOn)} hasta el ${dateEs(d.term.endsOn)}. Prórroga: ${d.term.extension}.${d.term.seasonal ? ` Contrato de temporada. Causa que lo justifica: ${d.term.seasonalCause}.` : ''}`)
  clause('Renta', `La renta mensual es de ${eur(d.rent.amountCents)}, pagadera por adelantado el día ${d.rent.payDay} de cada mes mediante ${d.rent.method}.${d.rent.updateAgreed ? ` Actualización expresamente pactada según: ${d.rent.updateIndex}.` : ' No se pacta actualización de la renta.'}`)
  clause('Fianza', `Se entrega una fianza de ${eur(d.deposit.amountCents)}. ${i.custodyNote}`)
  clause('Suministros', d.utilities + ' Las facturas estarán a disposición de la parte arrendataria.')
  clause('Gastos', d.expenses)
  clause('Certificado de eficiencia energética y habitabilidad', `Certificado de eficiencia energética: ${d.energyCert}. La parte arrendadora declara disponer de la documentación de habitabilidad exigible.`)
  if (i.clauses.length) { h(`${n++}. Cláusulas elegidas por la parte arrendadora`); i.clauses.forEach((c, k) => para(`${n - 1}.${k + 1} ${c.title}. ${c.body}`, { indent: 8 })) }
  if (d.rules.length) { h(`${n++}. Reglas de la casa`); d.rules.forEach(r => para('• ' + r, { indent: 8, gap: 1 })) }
  clause('Protección de datos', `Responsable del tratamiento: ${d.dataProtection.controller}. Finalidad: ${d.dataProtection.purpose}. Los datos se conservan mientras dure el contrato y los plazos legales aplicables.`)

  need(150); y -= 20
  para(`En ${d.place}, a ${dateEs(d.signDate)}.`)
  y -= 50; page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.7, color: ink }); page.drawLine({ start: { x: W - M - 200, y }, end: { x: W - M, y }, thickness: 0.7, color: ink })
  y -= 14; page.drawText('La parte arrendadora', { x: M, y, size: 9.5, font, color: grey }); page.drawText('La parte arrendataria', { x: W - M - 200, y, size: 9.5, font, color: grey }); y -= 14
  page.drawText(safe(d.landlord.name), { x: M, y, size: 9.5, font }); page.drawText(safe(d.tenant.name), { x: W - M - 200, y, size: 9.5, font })

  // Anexo I: inventario y fotos
  newPage(); h('Anexo I. Inventario y fotografías de la habitación')
  d.items.forEach(it => para(`• ${it.item}: ${COND[it.condition]}`, { gap: 1, indent: 8 }))
  if (i.photos.length) {
    y -= 10; const cols = 3; const gap = 10; const cw = (W - 2 * M - gap * (cols - 1)) / cols; const ch = cw * 0.75
    for (let k = 0; k < i.photos.length; k++) {
      if (k % cols === 0) need(ch + 40)
      const col = k % cols; const x = M + col * (cw + gap)
      let img; try { img = await doc.embedJpg(i.photos[k].bytes) } catch { img = await doc.embedPng(i.photos[k].bytes) }
      const sc = Math.min(cw / img.width, ch / img.height)
      page.drawImage(img, { x, y: y - ch, width: img.width * sc, height: img.height * sc })
      const cap = wrap(`${i.photos[k].date}${i.photos[k].caption ? ' · ' + i.photos[k].caption : ''}`, font, 8, cw)[0] ?? ''
      page.drawText(cap, { x, y: y - ch - 11, size: 8, font, color: grey })
      if (col === cols - 1 || k === i.photos.length - 1) y -= ch + 26
    }
  }
  // Anexo II: condiciones y entrega (solo lo marcado)
  const groups = describeConditions(i.conditions)
  if (groups.length) { newPage(); h('Anexo II. Condiciones y entrega'); for (const g of groups) { para(g.title, { f: bold, gap: 2 }); g.lines.forEach(l => para('• ' + l, { indent: 8, gap: 1 })); y -= 6 } }
  if (i.keysActs) {
    newPage(); h('Anexo III. Acta de entrega de llaves'); para('Fecha de entrega: ____ / ____ / ________    Llaves entregadas: ________________________'); y -= 40
    page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.7, color: ink }); page.drawLine({ start: { x: W - M - 200, y }, end: { x: W - M, y }, thickness: 0.7, color: ink }); y -= 14
    page.drawText('Arrendador', { x: M, y, size: 9.5, font, color: grey }); page.drawText('Arrendatario', { x: W - M - 200, y, size: 9.5, font, color: grey }); y -= 40
    h('Acta de devolución de llaves'); para('Fecha de devolución: ____ / ____ / ________    Llaves devueltas: ________________________'); y -= 40
    page.drawLine({ start: { x: M, y }, end: { x: M + 200, y }, thickness: 0.7, color: ink }); page.drawLine({ start: { x: W - M - 200, y }, end: { x: W - M, y }, thickness: 0.7, color: ink })
  }

  const total = pages.length
  pages.forEach((p, k) => {
    p.drawText(safe(`Contrato ${i.number}`), { x: M, y: H - 36, size: 9, font, color: grey })
    p.drawText(`Página ${k + 1} de ${total}`, { x: W - M - 70, y: H - 36, size: 9, font, color: grey })
    p.drawText('Modelo generado con Vendoya Habitaciones. Las cláusulas las elige el arrendador; esto no es asesoría jurídica.', { x: M, y: 30, size: 7.5, font, color: grey })
    if (i.watermark) p.drawText(safe(WATERMARK_TEXT), { x: 70, y: 260, size: 19, font: bold, color: rgb(0.8, 0.15, 0.1), opacity: 0.16, rotate: degrees(38) })
  })
  return doc.save()
}
