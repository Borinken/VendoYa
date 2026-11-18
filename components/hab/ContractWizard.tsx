'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Download, Printer, Eye, Share2 } from 'lucide-react'
import { useHab } from './HabProvider'
import { PhotoPicker, Thumb, download, useSnap } from './shared'
import { QrCode } from './QrCode'
import { Check, Disclosure, Notice, SelectField, TextField, fromCents, toCents } from './ui'
import { CONDITION_GROUPS, conditionsClause, defaultConditions, validateConditions, type CondValues } from '@/lib/hab/conditions'
import { contractNumber, emptyDraft, missingFields, needsWatermark, WATERMARK_TEXT, SEASONAL_UNVERIFIED, type ContractDraft } from '@/lib/hab/contract-form'
import { CATALOG_NOTICE, LEGAL_NOTICE } from '@/lib/hab/catalog'
import { todayStr } from '@/lib/hab/alerts'
import { waLink } from '@/lib/hab/whatsapp'
import type { Contract, Snapshot } from '@/lib/hab/types'

const STEPS = ['Partes', 'Inmueble y duración', 'Renta y fianza', 'Gastos y suministros', 'Condiciones y entrega', 'Cláusulas y reglas', 'Inventario y fotos', 'Revisar y generar']
const KEY = 'hab_contract_draft_v1'
const ITEMS = ['Cama y colchón', 'Armario', 'Escritorio y silla', 'Ventana y persiana', 'Cerradura y llaves']

type Saved = { draft: ContractDraft; conditions: CondValues; tenantId: string; roomId: string; step: number }
// Reparte por ruta ("a.b.c"): copia superficial a lo largo del camino.
function setIn<T>(o: T, path: string, v: unknown): T {
  const [k, ...rest] = path.split('.'); const cur = o as Record<string, unknown>
  return { ...cur, [k]: rest.length ? setIn(cur[k], rest.join('.'), v) : v } as T
}

function prefill(d: Snapshot, orgName: string, email: string, roomId: string, tenantId: string, base?: Contract): Saved {
  const draft = emptyDraft(); const room = d.rooms.find(r => r.id === roomId); const prop = d.properties.find(p => p.id === room?.property_id); const t = d.tenants.find(x => x.id === tenantId)
  draft.landlord = { name: orgName, taxId: '', address: '', contact: email }
  if (t) draft.tenant = { ...draft.tenant, name: t.full_name, phone: t.phone, email: t.email }
  if (room && prop) {
    draft.property = { ...draft.property, address: `${prop.address}, ${prop.city} (${prop.province})`, roomLabel: room.label, sizeM2: room.size_m2 }
    draft.rent.amountCents = room.rent_cents; draft.deposit.amountCents = room.deposit_cents; draft.rules = [...prop.rules]
    draft.utilities = room.includes.utilities ? 'Los suministros están incluidos en la renta.' : 'Los suministros (luz, agua, gas, internet) se reparten entre las habitaciones a partes iguales; la factura está a disposición del arrendatario.'
    draft.deposit.custody = prop.community === 'Andalucía' ? 'owner' : 'regional'
  }
  draft.dataProtection.controller = orgName
  draft.items = ITEMS.map(item => ({ item, condition: 'ok' as const }))
  draft.signDate = todayStr(); draft.place = prop?.city ?? ''
  if (base) { // duplicar para renovar: mismas condiciones, un año más
    draft.term.startsOn = base.ends_on; const e = new Date(base.ends_on + 'T00:00:00'); e.setFullYear(e.getFullYear() + 1); draft.term.endsOn = e.toISOString().slice(0, 10)
    draft.rent.amountCents = base.rent_cents; draft.deposit.amountCents = base.deposit_cents; draft.clauseCodes = base.clauses.map(c => c.code).filter(c => c !== 'anexo_condiciones')
  }
  return { draft, conditions: defaultConditions(), tenantId, roomId, step: 0 }
}

export function ContractWizard({ base, onClose }: { base?: Contract; onClose: () => void }) {
  const d = useSnap(); const { repo, act, notify, session } = useHab()
  const [s, setS] = useState<Saved | null>(null); const [showErr, setShowErr] = useState(false); const [saved, setSaved] = useState<Contract | null>(null)
  const [pdf, setPdf] = useState<{ url: string; bytes: Uint8Array } | null>(null); const [busy, setBusy] = useState(false); const [secure, setSecure] = useState(''); const frame = useRef<HTMLIFrameElement>(null)
  useEffect(() => { // restaura el borrador autoguardado (solo si no es un duplicado)
    if (!d || s) return
    try { const raw = base ? null : localStorage.getItem(KEY); if (raw) { setS(JSON.parse(raw) as Saved); return } } catch { /* borrador corrupto */ }
    setS(prefill(d, d.org?.name ?? session.name, session.email, base?.room_id ?? '', base?.tenant_id ?? '', base))
  }, [d, s, base, session])
  useEffect(() => { if (s && !saved) try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* sin espacio */ } }, [s, saved])
  const missing = useMemo(() => (s ? missingFields(s.draft) : []), [s])
  if (!d || !s) return <p className="muted">Cargando…</p>
  const { draft, conditions, step } = s
  const err = (p: string) => (showErr ? missing.find(m => m.path === p)?.message : undefined)
  const set = (path: string, v: unknown) => setS(x => (x ? { ...x, draft: setIn(x.draft, path, v) } : x))
  const chosen = d.clauses.filter(c => draft.clauseCodes.includes(c.code))
  const watermark = needsWatermark(chosen)
  const room = d.rooms.find(r => r.id === s.roomId); const prop = d.properties.find(p => p.id === room?.property_id)
  const condErrs = validateConditions(conditions)
  const num = contractNumber(saved?.id ?? s.roomId ?? 'nuevo', draft.term.startsOn)
  const clausesForPdf = [...chosen.map(c => ({ code: c.code, title: c.title, body: c.body }))]
  const custodyNote = draft.deposit.custody === 'owner'
    ? 'En Andalucía la custodia de la fianza corresponde a la parte arrendadora desde el 24 de enero de 2026 (Ley 5/2025).'
    : 'La fianza se depositará en el organismo autonómico correspondiente, según la normativa de la comunidad.'
  const pickRoom = (id: string) => { const f = prefill(d, d.org?.name ?? session.name, session.email, id, s.tenantId); setS({ ...f, step: s.step, conditions: s.conditions, draft: { ...f.draft, clauseCodes: draft.clauseCodes, landlord: { ...f.draft.landlord, taxId: draft.landlord.taxId, address: draft.landlord.address } } }) }
  const pickTenant = (id: string) => { const t = d.tenants.find(x => x.id === id); setS({ ...s, tenantId: id, draft: t ? { ...draft, tenant: { ...draft.tenant, name: t.full_name, phone: t.phone, email: t.email } } : draft }) }

  async function makePdf() {
    if (missing.length || condErrs.length) { setShowErr(true); notify(`Faltan ${missing.length + condErrs.length} campos obligatorios`, 'bad'); return null }
    setBusy(true)
    try {
      const { buildContractPdf } = await import('@/lib/hab/contract-pdf')
      const photos = await Promise.all(draft.photos.map(async p => { const u = await repo.fileUrl('hab-photos', p.path); const b = u ? new Uint8Array(await (await fetch(u)).arrayBuffer()) : null; return b ? { bytes: b, caption: p.caption, date: p.date } : null }))
      const bytes = await buildContractPdf({ number: num, draft, clauses: clausesForPdf, conditions, watermark, photos: photos.filter((x): x is NonNullable<typeof x> => !!x), keysActs: conditions.keys_act_delivery === true || conditions.keys_act_return === true, custodyNote })
      const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }))
      if (pdf) URL.revokeObjectURL(pdf.url); setPdf({ url, bytes }); return bytes
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo generar el PDF', 'bad'); return null } finally { setBusy(false) }
  }
  async function save() {
    if (missing.length) { setShowErr(true); return }
    let tenantId = s!.tenantId
    if (!tenantId) { const t = await act(() => repo.createTenant({ full_name: draft.tenant.name, email: draft.tenant.email, phone: draft.tenant.phone })); if (!t) return; tenantId = t.id }
    const c = await act(() => repo.createContract({ room_id: s!.roomId, tenant_id: tenantId, starts_on: draft.term.startsOn, ends_on: draft.term.endsOn, rent_cents: draft.rent.amountCents, deposit_cents: draft.deposit.amountCents, clauses: [...clausesForPdf, conditionsClause(conditions)] }), 'Contrato guardado como borrador')
    if (!c) return
    await act(() => repo.createInventory({ room_id: s!.roomId, contract_id: c.id, kind: 'entry', taken_at: todayStr(), notes: 'Inventario de entrada del contrato ' + num, items: [
      ...draft.items.map(i => ({ item: i.item, condition: i.condition, note: '', photo_paths: [] as string[] })),
      ...(draft.photos.length ? [{ item: 'Fotografías de la habitación y zonas comunes', condition: 'ok' as const, note: draft.photos.map(p => p.caption).filter(Boolean).join(' · ').slice(0, 290), photo_paths: draft.photos.map(p => p.path) }] : [])] }))
    localStorage.removeItem(KEY); setSaved(c)
  }
  async function prepareSign() {
    if (!saved) return
    const bytes = pdf?.bytes ?? await makePdf(); if (!bytes) return
    try {
      const path = await repo.upload('hab-docs', new File([bytes.buffer as ArrayBuffer], `contrato-${num}.pdf`, { type: 'application/pdf' }))
      await repo.setContractSharedPdf(saved.id, path); notify('PDF preparado: ve a Contratos > Firma electrónica')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo preparar el PDF', 'bad') }
  }
  async function secureLink() {
    if (!saved) return
    const bytes = pdf?.bytes ?? await makePdf(); if (!bytes) return
    try {
      const path = await repo.upload('hab-docs', new File([bytes.buffer as ArrayBuffer], `contrato-${num}.pdf`, { type: 'application/pdf' }))
      await repo.setContractSharedPdf(saved.id, path)
      const r = await repo.createTenantLink(saved.id); setSecure(`${location.origin}/habitaciones/t/${r.token}`); notify('Enlace seguro creado (el anterior queda revocado)')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo crear el enlace', 'bad') }
  }
  async function share() {
    const bytes = pdf?.bytes ?? await makePdf(); if (!bytes) return
    const file = new File([bytes.buffer as ArrayBuffer], `contrato-${num}.pdf`, { type: 'application/pdf' })
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: `Contrato ${num}`, text: `Hola ${draft.tenant.name}, te envío el contrato de la habitación ${draft.property.roomLabel}.` }); return } catch { /* cancelado */ } }
    download(`contrato-${num}.pdf`, new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }))
    window.open(waLink(draft.tenant.phone, `Hola ${draft.tenant.name}, te envío el contrato de la habitación ${draft.property.roomLabel}. Te lo adjunto en este chat.`), '_blank', 'noreferrer')
    notify('Se ha descargado el PDF: adjúntalo en el chat de WhatsApp que se abre')
  }

  const total = missing.length + condErrs.length
  const stepBody = [
    <div key="0" style={{ display: 'grid', gap: '1rem' }}>
      <h3>Arrendador</h3>
      <div className="h-grid"><TextField label="Nombre o razón social" value={draft.landlord.name} onChange={v => set('landlord.name', v)} error={err('landlord.name')} required />
        <TextField label="DNI / NIE / CIF" value={draft.landlord.taxId} onChange={v => set('landlord.taxId', v)} error={err('landlord.taxId')} required />
        <TextField label="Domicilio" value={draft.landlord.address} onChange={v => set('landlord.address', v)} error={err('landlord.address')} required />
        <TextField label="Contacto" value={draft.landlord.contact} onChange={v => set('landlord.contact', v)} error={err('landlord.contact')} required /></div>
      <h3>Arrendatario</h3>
      <SelectField label="Inquilino existente (o escribe uno nuevo abajo)" value={s.tenantId} onChange={pickTenant} options={[['', 'Nuevo inquilino'], ...d.tenants.map(t => [t.id, t.full_name] as [string, string])]} />
      <div className="h-grid"><TextField label="Nombre" value={draft.tenant.name} onChange={v => set('tenant.name', v)} error={err('tenant.name')} required />
        <TextField label="DNI / NIE" value={draft.tenant.taxId} onChange={v => set('tenant.taxId', v)} error={err('tenant.taxId')} required hint="Se valida la letra" />
        <TextField label="Domicilio" value={draft.tenant.address} onChange={v => set('tenant.address', v)} error={err('tenant.address')} required />
        <TextField label="Teléfono" value={draft.tenant.phone} onChange={v => set('tenant.phone', v)} error={err('tenant.phone')} required />
        <TextField label="Correo" type="email" value={draft.tenant.email} onChange={v => set('tenant.email', v)} error={err('tenant.email')} required /></div>
    </div>,
    <div key="1" style={{ display: 'grid', gap: '1rem' }}>
      <SelectField label="Habitación (rellena los datos del piso)" value={s.roomId} onChange={pickRoom} options={[['', 'Elige una habitación'], ...d.rooms.map(r => [r.id, `${d.properties.find(p => p.id === r.property_id)?.name} · ${r.label}`] as [string, string])]} />
      <div className="h-grid"><TextField label="Dirección completa" value={draft.property.address} onChange={v => set('property.address', v)} error={err('property.address')} required />
        <TextField label="Habitación" value={draft.property.roomLabel} onChange={v => set('property.roomLabel', v)} error={err('property.roomLabel')} required />
        <TextField label="Metros cuadrados" type="number" value={draft.property.sizeM2 || ''} onChange={v => set('property.sizeM2', Number(v))} error={err('property.sizeM2')} required />
        <TextField label="Zonas comunes de uso" value={draft.property.commonAreas} onChange={v => set('property.commonAreas', v)} error={err('property.commonAreas')} required />
        <TextField label="Referencia catastral (opcional)" value={draft.property.cadastral ?? ''} onChange={v => set('property.cadastral', v)} /></div>
      <div className="h-grid"><TextField label="Inicio" type="date" value={draft.term.startsOn} onChange={v => set('term.startsOn', v)} error={err('term.startsOn')} required />
        <TextField label="Fin" type="date" value={draft.term.endsOn} onChange={v => set('term.endsOn', v)} error={err('term.endsOn')} required />
        <TextField label="Prórroga" value={draft.term.extension} onChange={v => set('term.extension', v)} error={err('term.extension')} required /></div>
      <Check label="Contrato de temporada" checked={draft.term.seasonal} onChange={v => set('term.seasonal', v)} />
      {draft.term.seasonal && <><TextField label="Causa concreta que justifica la temporada" value={draft.term.seasonalCause ?? ''} onChange={v => set('term.seasonalCause', v)} error={err('term.seasonalCause')} required />
        {SEASONAL_UNVERIFIED && <Notice>Los límites de duración y la causa de temporada no están verificados con un abogado. Revísalo antes de firmar.</Notice>}</>}
    </div>,
    <div key="2" style={{ display: 'grid', gap: '1rem' }}>
      <div className="h-grid"><TextField label="Renta mensual (€)" type="number" value={fromCents(draft.rent.amountCents)} onChange={v => set('rent.amountCents', toCents(v))} error={err('rent.amountCents')} required />
        <TextField label="Día de pago (1-28)" type="number" value={draft.rent.payDay} onChange={v => set('rent.payDay', Number(v))} error={err('rent.payDay')} required />
        <TextField label="Forma de pago" value={draft.rent.method} onChange={v => set('rent.method', v)} error={err('rent.method')} required /></div>
      <Check label="Se pacta expresamente una actualización de la renta" checked={draft.rent.updateAgreed} onChange={v => set('rent.updateAgreed', v)} />
      {draft.rent.updateAgreed && <TextField label="Índice de actualización" value={draft.rent.updateIndex ?? ''} onChange={v => set('rent.updateIndex', v)} error={err('rent.updateIndex')} required />}
      <TextField label="Fianza (€)" type="number" value={fromCents(draft.deposit.amountCents)} onChange={v => set('deposit.amountCents', toCents(v))} />
      <SelectField label="Custodia de la fianza" value={draft.deposit.custody} onChange={v => set('deposit.custody', v)} options={[['owner', 'La guarda el propietario (Andalucía, desde 24-ene-2026, Ley 5/2025)'], ['regional', 'Depósito autonómico']]} />
      {draft.deposit.custody === 'regional' && <><Check label="Entiendo que debo consultar el depósito autonómico de mi comunidad" checked={draft.deposit.regionalAck} onChange={v => set('deposit.regionalAck', v)} />{err('deposit.regionalAck') && <small role="alert" style={{ color: 'var(--h-bad)' }}>{err('deposit.regionalAck')}</small>}</>}
      {prop && prop.community !== 'Andalucía' && <Notice>Consulta el depósito autonómico de {prop.community}: esta herramienta no sustituye la norma de tu comunidad.</Notice>}
    </div>,
    <div key="3" style={{ display: 'grid', gap: '1rem' }}>
      <label className="h-field"><span>Suministros: qué incluye cada uno y cómo se reparte *</span><textarea className="h-textarea" aria-invalid={!!err('utilities')} value={draft.utilities} onChange={e => set('utilities', e.target.value)} />{err('utilities') && <small role="alert" style={{ color: 'var(--h-bad)' }}>{err('utilities')}</small>}</label>
      <TextField label="Gastos (comunidad, IBI, otros)" value={draft.expenses} onChange={v => set('expenses', v)} error={err('expenses')} required />
      <TextField label="Certificado de eficiencia energética (referencia o «pendiente»)" value={draft.energyCert} onChange={v => set('energyCert', v)} error={err('energyCert')} required />
      <Check label="Dispongo de la cédula de habitabilidad / documentación de habitabilidad" checked={draft.habitability} onChange={v => set('habitability', v)} />
      {err('habitability') && <small role="alert" style={{ color: 'var(--h-bad)' }}>{err('habitability')}</small>}
    </div>,
    <div key="4" style={{ display: 'grid', gap: '.75rem' }}>
      <Notice>Marca solo lo que quieras que aparezca en el contrato (Anexo II). Lo que no marques no se imprime. Importes en euros, ≥ 0.</Notice>
      {condErrs.map(e => <p key={e} role="alert" style={{ color: 'var(--h-bad)' }}>{e}</p>)}
      {CONDITION_GROUPS.map(g => (
        <Disclosure key={g.id} summary={g.title}>
          <div className="h-grid">{g.opts.map(o => {
            const v = conditions[o.id]; const setC = (x: boolean | number | string) => setS(z => (z ? { ...z, conditions: { ...z.conditions, [o.id]: x } } : z))
            if (o.kind === 'bool') return <Check key={o.id} label={o.label} checked={v === true} onChange={setC} />
            if (o.kind === 'choice') return <SelectField key={o.id} label={o.label} value={String(v ?? '')} onChange={setC} options={o.choices!} />
            if (o.kind === 'text') return <TextField key={o.id} label={o.label} value={String(v ?? '')} onChange={setC} />
            if (o.kind === 'cents') return <TextField key={o.id} label={o.label} type="number" value={typeof v === 'number' ? fromCents(v) : ''} onChange={x => setC(toCents(x))} />
            return <TextField key={o.id} label={o.label} type="number" value={typeof v === 'number' ? v : ''} onChange={x => setC(Math.max(0, Math.round(Number(x)) || 0))} />
          })}</div>
        </Disclosure>
      ))}
      <TemplateBar conditions={conditions} onApply={c => setS(z => (z ? { ...z, conditions: c } : z))} />
    </div>,
    <div key="5" style={{ display: 'grid', gap: '1rem' }}>
      <Notice>{CATALOG_NOTICE}. Tú eliges las cláusulas; la app no recomienda ninguna.</Notice>
      {d.clauses.map(c => (
        <label key={c.code} className="h-panel" style={{ display: 'flex', gap: '.75rem', cursor: 'pointer' }}>
          <input type="checkbox" style={{ accentColor: 'var(--h-accent-text)', width: 20, height: 20, flex: 'none' }} checked={draft.clauseCodes.includes(c.code)} onChange={e => set('clauseCodes', e.target.checked ? [...draft.clauseCodes, c.code] : draft.clauseCodes.filter(x => x !== c.code))} />
          <span><strong>{c.title}</strong> {!c.reviewed_by_lawyer && <span className="h-badge warn">sin revisar</span>}{c.community && <span className="h-badge">{c.community}</span>}<br /><span className="muted small">{c.body}</span></span>
        </label>
      ))}
      <label className="h-field"><span>Reglas de la casa (una por línea)</span><textarea className="h-textarea" value={draft.rules.join('\n')} onChange={e => set('rules', e.target.value.split('\n').filter(x => x.trim()))} /></label>
      <div className="h-grid"><TextField label="Responsable de los datos" value={draft.dataProtection.controller} onChange={v => set('dataProtection.controller', v)} error={err('dataProtection.controller')} required />
        <TextField label="Finalidad" value={draft.dataProtection.purpose} onChange={v => set('dataProtection.purpose', v)} error={err('dataProtection.purpose')} required />
        <TextField label="Lugar de firma" value={draft.place} onChange={v => set('place', v)} error={err('place')} required />
        <TextField label="Fecha de firma" type="date" value={draft.signDate} onChange={v => set('signDate', v)} error={err('signDate')} required /></div>
    </div>,
    <div key="6" style={{ display: 'grid', gap: '1rem' }}>
      <h3>Estado de cada elemento</h3>
      {draft.items.map((it, i) => (
        <div key={i} className="h-grid"><TextField label="Elemento" value={it.item} onChange={v => set(`items.${i}.item`, v)} />
          <SelectField label="Estado" value={it.condition} onChange={v => set(`items.${i}.condition`, v)} options={[['ok', 'En buen estado'], ['worn', 'Desgastado'], ['damaged', 'Dañado']]} /></div>
      ))}
      <button type="button" className="h-btn sm" style={{ width: 'fit-content' }} onClick={() => set('items', [...draft.items, { item: '', condition: 'ok' }])}>Añadir elemento</button>
      <h3>Fotos (máx. 12) — habitación y zonas comunes</h3>
      <PhotoPicker max={12} paths={draft.photos.map(p => p.path)} label="Subir fotos (móvil o galería)" onChange={paths => set('photos', paths.map(p => draft.photos.find(x => x.path === p) ?? { path: p, caption: '', date: todayStr() }))} />
      {draft.photos.map((p, i) => <div key={p.path} className="flex gap-3 items-end"><Thumb path={p.path} /><div style={{ flex: 1 }}><TextField label={`Pie de foto ${i + 1} (${p.date})`} value={p.caption} onChange={v => set(`photos.${i}.caption`, v)} /></div></div>)}
    </div>,
    <div key="7" style={{ display: 'grid', gap: '1rem' }}>
      {watermark && <Notice>El PDF llevará la marca «{WATERMARK_TEXT}» porque {chosen.length === 0 ? 'no has elegido cláusulas' : 'alguna cláusula elegida no ha sido revisada por un abogado'}.</Notice>}
      <div className="flex flex-wrap gap-2">
        <button className="h-btn" disabled={busy} onClick={makePdf}><Eye size={18} aria-hidden /> Vista previa</button>
        <button className="h-btn" disabled={busy} onClick={async () => { const b = pdf?.bytes ?? await makePdf(); if (b) download(`contrato-${num}.pdf`, new Blob([b.buffer as ArrayBuffer], { type: 'application/pdf' })) }}><Download size={18} aria-hidden /> Descargar PDF</button>
        <button className="h-btn" disabled={busy} onClick={async () => { if (!pdf) await makePdf(); setTimeout(() => frame.current?.contentWindow?.print(), 400) }}><Printer size={18} aria-hidden /> Imprimir</button>
        <button className="h-btn" disabled={busy} onClick={share}><Share2 size={18} aria-hidden /> Enviar por WhatsApp</button>
      </div>
      {pdf && <iframe ref={frame} title="Vista previa del contrato" src={pdf.url} style={{ width: '100%', height: 640, border: '1px solid var(--h-line)', borderRadius: 12, background: '#fff' }} />}
      <div className="h-panel" style={{ display: 'grid', gap: '.75rem' }}>
        <h3>Firma electrónica en pantalla (pendiente de revisión por abogado)</h3>
        <p className="muted small">Firma electrónica simple, no cualificada. Prepara el PDF y envía los enlaces de firma desde Contratos. Sigues pudiendo imprimir y firmar a mano.</p>
        <button className="h-btn" style={{ width: 'fit-content' }} disabled={!saved || busy} onClick={prepareSign}>Preparar para firma en pantalla</button>
      </div>
      <div className="h-panel" style={{ display: 'grid', gap: '.75rem' }}>
        <h3>Enlace seguro de solo lectura</h3>
        <p className="muted small">Comparte el contrato con el inquilino por un enlace personal: puede descargarlo, caduca a los 90 días y puedes revocarlo en Inquilinos. {saved ? '' : 'Guarda antes el contrato.'}</p>
        <button className="h-btn" style={{ width: 'fit-content' }} disabled={!saved || busy} onClick={secureLink}>Crear enlace seguro</button>
        {secure && <div style={{ display: 'grid', gap: '.5rem', justifyItems: 'start' }}><Notice tone="ok"><code style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{secure}</code></Notice>
          <a className="h-btn sm" target="_blank" rel="noreferrer" href={waLink(draft.tenant.phone, `Hola ${draft.tenant.name}, aquí tienes tu contrato de la habitación ${draft.property.roomLabel} para leer y descargar: ${secure}`)}>Enviar el enlace por WhatsApp</a><QrCode text={secure} size={140} /></div>}
      </div>
      <div className="h-panel" style={{ display: 'grid', gap: '.75rem' }}>
        <h3>Guardar en la app</h3><p className="muted small">Crea el contrato en borrador y el inventario de entrada con las fotos. Después imprime, firma a mano y sube la foto o el escaneo desde la lista de contratos: pasará a «Activo». La firma en pantalla llegará en una v2.</p>
        {saved ? <Notice tone="ok">Contrato guardado. Ve a la lista para subir el firmado. <button className="h-btn sm" onClick={onClose}>Volver a contratos</button></Notice>
          : <button className="h-btn primary" style={{ width: 'fit-content' }} disabled={!s.roomId} onClick={save}>Guardar contrato (borrador)</button>}
      </div>
    </div>,
  ]
  return (
    <div className="h-rise">
      <button className="h-btn quiet sm" onClick={onClose}><ArrowLeft size={16} aria-hidden /> Volver a contratos</button>
      <h1 style={{ margin: '.75rem 0 .5rem' }}>Nuevo contrato</h1><p><strong>Paso {step + 1} de {STEPS.length}</strong> · {STEPS[step]}</p><p className="muted small">Se guarda solo como borrador en este dispositivo.</p>
      <div role="status" className={`h-notice ${total ? '' : 'ok'}`} style={{ margin: '1rem 0', position: 'sticky', top: 'calc(var(--h-banner-h) + 4px)', zIndex: 5, background: 'var(--h-surface)' }}>
        {total ? <>Faltan {total} campos obligatorios. <button className="h-btn sm quiet" style={{ paddingLeft: 0, textDecoration: 'underline' }} onClick={() => { setShowErr(true) }}>Marcar los que faltan</button></> : 'Todos los campos obligatorios están completos.'}
        {showErr && missing.length > 0 && <ul className="small" style={{ margin: '.4rem 0 0', paddingLeft: '1.1rem', listStyle: 'disc', maxHeight: '22vh', overflowY: 'auto' }}>{missing.slice(0, 6).map(m => <li key={m.path}>{m.message}</li>)}{missing.length > 6 && <li>…y {missing.length - 6} más</li>}</ul>}
      </div>
      <nav aria-label="Pasos" className="h-steps">{STEPS.map((t, i) => <button key={t} className={i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined} aria-label={`${i + 1}. ${t}`} title={t} onClick={() => setS({ ...s, step: i })} />)}</nav>
      <section className="h-panel">{stepBody[step]}</section>
      <div className="flex justify-between" style={{ marginTop: '1rem' }}>
        <button className="h-btn" disabled={step === 0} onClick={() => setS({ ...s, step: step - 1 })}>Anterior</button>
        {step < STEPS.length - 1 && <button className="h-btn primary" onClick={() => { if (step === STEPS.length - 2) setShowErr(true); setS({ ...s, step: step + 1 }) }}>Siguiente</button>}
      </div>
      <p className="muted small" style={{ marginTop: '1rem' }}>{LEGAL_NOTICE}</p>
    </div>
  )
}

// Plantillas de habitación reutilizables, guardadas en base de datos por organización (hab_room_templates).
function TemplateBar({ conditions, onApply }: { conditions: CondValues; onApply: (c: CondValues) => void }) {
  const d = useSnap(); const { repo, act } = useHab(); const [name, setName] = useState('')
  return (
    <div className="h-panel" style={{ display: 'grid', gap: '.75rem' }}><h3>Plantillas de habitación</h3>
      <div className="flex flex-wrap gap-2 items-end"><div style={{ flex: 1, minWidth: 200 }}><TextField label="Guardar estas condiciones como plantilla" value={name} onChange={setName} placeholder="Habitación estándar" /></div>
        <button className="h-btn sm" disabled={!name.trim()} onClick={() => act(() => repo.saveRoomTemplate(name, conditions), 'Plantilla guardada').then(() => setName(''))}>Guardar plantilla</button></div>
      {(d?.roomTemplates ?? []).map(t => <div key={t.name} className="h-row"><span>{t.name}</span><span className="flex gap-2"><button className="h-btn sm" onClick={() => onApply(t.conditions)}>Aplicar</button><button className="h-btn sm danger" onClick={() => act(() => repo.deleteRoomTemplate(t.name), 'Plantilla borrada')}>Borrar</button></span></div>)}
    </div>
  )
}
