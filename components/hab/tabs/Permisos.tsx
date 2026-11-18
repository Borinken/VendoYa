'use client'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Badge, Disclosure, Empty, Notice, Page, SelectField, TextField, eur, fmtDate, toCents } from '../ui'
import { accessInput, inviteInput, type AccessKind } from '@/lib/hab/types'

const KIND: Record<AccessKind, string> = { manage: 'Gestión', sublet: 'Subarriendo', view: 'Solo ver' }
const ST = { granted: 'Vigente', pending: 'Pendiente', revoked: 'Revocado' } as const

export function Permisos() {
  const d = useSnap(); const { repo, act, session, notify } = useHab()
  const [v, setV] = useState({ property_id: '', grantee: '', kind: 'manage' as AccessKind, max: '', until: '' }); const [doc, setDoc] = useState<string | null>(null); const [err, setErr] = useState<Record<string, string>>({})
  const [iv, setIv] = useState({ email: '', role: 'manager' as 'admin' | 'manager' | 'viewer' | 'tenant', contract: '' }); const [ierr, setIerr] = useState<Record<string, string>>({}); const [link, setLink] = useState('')
  if (!d) return <Loading />
  const own = d.properties.filter(p => p.org_id === session.orgId)
  const isAdmin = session.role === 'admin'
  async function grant(e: React.FormEvent) {
    e.preventDefault(); const r = accessInput.safeParse({ property_id: v.property_id, grantee_org_id: v.grantee.trim(), kind: v.kind, consent_doc_path: doc, max_total_rent_cents: v.max ? toCents(v.max) : null, valid_until: v.until || null })
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({}); if (await act(() => repo.createAccess(r.data), 'Permiso concedido')) { setDoc(null); setV(s => ({ ...s, grantee: '', max: '' })) }
  }
  async function invite(e: React.FormEvent) {
    e.preventDefault(); const r = inviteInput.safeParse({ email: iv.email, role: iv.role, contract_id: iv.role === 'tenant' ? iv.contract : null })
    if (!r.success) { setIerr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setIerr({}); const res = await act(() => repo.createInvite(r.data), 'Invitación creada')
    if (res) setLink(`${location.origin}/habitaciones/app/registro?invite=${res.token}`)
  }
  const mine = d.access.filter(a => own.some(p => p.id === a.property_id)); const received = d.access.filter(a => a.grantee_org_id === session.orgId)
  return (
    <Page title="Permisos y equipo" intro="Concede a una inmobiliaria la gestión de un piso o a un subarrendador el permiso de alquilar sus habitaciones. Puedes revocarlo cuando quieras.">
      {session.orgId && <div style={{ marginBottom: '1rem' }}><Notice>Tu código de organización (para que otro propietario te dé permisos): <code style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{session.orgId}</code></Notice></div>}
      {isAdmin && own.length > 0 && <Disclosure summary="Conceder un permiso">
        <form onSubmit={grant} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="h-grid">
            <SelectField label="Piso" value={v.property_id} onChange={x => setV(s => ({ ...s, property_id: x }))} options={[['', 'Elige un piso'], ...own.map(p => [p.id, p.name] as [string, string])]} />
            <TextField label="Código de la organización" value={v.grantee} onChange={x => setV(s => ({ ...s, grantee: x }))} required hint="Te lo da la inmobiliaria o el subarrendador" error={err.grantee_org_id} />
            <SelectField label="Tipo de permiso" value={v.kind} onChange={x => setV(s => ({ ...s, kind: x }))} options={Object.entries(KIND) as [AccessKind, string][]} />
            <TextField label="Caduca el (opcional)" type="date" value={v.until} onChange={x => setV(s => ({ ...s, until: x }))} />
          </div>
          {v.kind === 'sublet' && (
            <div className="h-panel" style={{ display: 'grid', gap: '.75rem' }}>
              <Notice>El subarriendo solo es válido con el consentimiento del propietario por escrito y un tope de renta total.</Notice>
              <TextField label="Tope de renta total (€/mes)" type="number" value={v.max} onChange={x => setV(s => ({ ...s, max: x }))} error={err.consent_doc_path} required />
              <label className="h-field"><span>Documento de consentimiento (PDF o imagen) *</span><input className="h-input" type="file" accept="application/pdf,image/jpeg,image/png"
                onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setDoc(await repo.upload('hab-docs', f)); notify('Documento subido') } catch (x) { notify(x instanceof Error ? x.message : 'Error', 'bad') } }} /></label>
              {doc && <Badge tone="ok">Documento adjunto</Badge>}
            </div>
          )}
          {err.property_id && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err.property_id}</p>}
          <button className="h-btn primary" style={{ width: 'fit-content' }}>Conceder</button>
        </form></Disclosure>}
      <section className="h-section"><h2>Permisos que he concedido</h2>
        {mine.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Ninguno.</p> : mine.map(a => (
          <div className="h-row" key={a.id}><span><strong>{d.properties.find(p => p.id === a.property_id)?.name}</strong> → {d.orgNames[a.grantee_org_id] ?? a.grantee_org_id}<br /><span className="muted small">{KIND[a.kind]}{a.max_total_rent_cents ? ` · tope ${eur(a.max_total_rent_cents)}` : ''}{a.valid_until ? ` · hasta ${fmtDate(a.valid_until)}` : ''}</span></span>
            <span className="flex gap-2 items-center"><Badge tone={a.status === 'granted' ? 'ok' : a.status === 'revoked' ? 'bad' : 'warn'}>{ST[a.status]}</Badge>
              {isAdmin && a.status !== 'revoked' && <button className="h-btn sm danger" onClick={() => { if (confirm('¿Revocar este permiso? La organización perderá el acceso al piso.')) void act(() => repo.revokeAccess(a.id), 'Permiso revocado') }}>Revocar</button>}</span></div>
        ))}</section>
      <section className="h-section"><h2>Permisos que he recibido</h2>
        {received.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Ninguno.</p> : received.map(a => (
          <div className="h-row" key={a.id}><span><strong>{d.properties.find(p => p.id === a.property_id)?.name ?? 'Piso del propietario'}</strong><br /><span className="muted small">{KIND[a.kind]}{a.max_total_rent_cents ? ` · tope ${eur(a.max_total_rent_cents)}` : ''}</span></span><Badge tone={a.status === 'granted' ? 'ok' : 'bad'}>{ST[a.status]}</Badge></div>
        ))}</section>
      <section className="h-section"><h2>Equipo</h2>
        {d.members.map(m => <div className="h-row" key={m.user_id}><span>{m.label ?? `Usuario ${m.user_id.slice(0, 6)}`}</span><Badge>{m.role === 'admin' ? 'Administrador' : m.role === 'manager' ? 'Encargado' : 'Solo lectura'}</Badge></div>)}
        {isAdmin && <Disclosure summary="Invitar a una persona">
          <form onSubmit={invite} noValidate style={{ display: 'grid', gap: '1rem' }}>
            <div className="h-grid">
              <TextField label="Correo" type="email" value={iv.email} onChange={x => setIv(s => ({ ...s, email: x }))} error={ierr.email} required />
              <SelectField label="Rol" value={iv.role} onChange={x => setIv(s => ({ ...s, role: x }))} options={[['admin', 'Administrador'], ['manager', 'Encargado'], ['viewer', 'Solo lectura'], ['tenant', 'Inquilino (portal)']]} />
              {iv.role === 'tenant' && <SelectField label="Contrato" value={iv.contract} onChange={x => setIv(s => ({ ...s, contract: x }))} options={[['', 'Elige contrato'], ...d.contracts.map(c => [c.id, `${d.tenants.find(t => t.id === c.tenant_id)?.full_name} · ${d.rooms.find(r => r.id === c.room_id)?.label}`] as [string, string])]} />}
            </div>
            {ierr.contract_id && <p role="alert" style={{ color: 'var(--h-bad)' }}>{ierr.contract_id}</p>}
            <button className="h-btn primary" style={{ width: 'fit-content' }}>Crear invitación</button>
            {link && <Notice tone="ok">Envía este enlace (caduca en 7 días, un solo uso): <code style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{link}</code></Notice>}
          </form></Disclosure>}
        {d.invites.filter(i => !i.used_at).length > 0 && <p className="muted small" style={{ marginTop: '.75rem' }}>Invitaciones pendientes: {d.invites.filter(i => !i.used_at).map(i => i.email).join(', ')}</p>}
      </section>
      {d.access.length === 0 && d.members.length === 0 && <Empty title="Nada por aquí" hint="Concede un permiso o invita a tu equipo." />}
    </Page>
  )
}
