'use client'
import { useState } from 'react'
import { MessageCircle, Copy, QrCode as QrIcon, Printer } from 'lucide-react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { QrCode } from '../QrCode'
import { Badge, Disclosure, Empty, Notice, Page, TextField } from '../ui'
import { tenantInput } from '@/lib/hab/types'
import { roomLabel } from '@/lib/hab/reports'
import { waLink, welcomeMessage } from '@/lib/hab/whatsapp'

export function Inquilinos() {
  const d = useSnap(); const { repo, act, notify, session } = useHab()
  const [v, setV] = useState({ full_name: '', email: '', phone: '' }); const [err, setErr] = useState<Record<string, string>>({})
  const [link, setLink] = useState<{ contractId: string; url: string } | null>(null)
  if (!d) return <Loading />
  async function save(e: React.FormEvent) {
    e.preventDefault(); const r = tenantInput.safeParse(v)
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({}); if (await act(() => repo.createTenant(r.data), 'Inquilino añadido')) setV({ full_name: '', email: '', phone: '' })
  }
  async function makeLink(contractId: string) {
    const r = await act(() => repo.createTenantLink(contractId), 'Enlace personal creado (el anterior queda revocado)')
    if (r) setLink({ contractId, url: `${location.origin}/habitaciones/t/${r.token}` })
  }
  const canWrite = session.role !== 'viewer'
  return (
    <Page title="Inquilinos" intro="Ficha de cada persona y su contrato. No se recogen ni se filtran datos como sexo o nacionalidad.">
      {canWrite && <Disclosure summary="Nuevo inquilino" open={d.tenants.length === 0}>
        <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="h-grid">
            <TextField label="Nombre completo" value={v.full_name} onChange={x => setV(s => ({ ...s, full_name: x }))} error={err.full_name} required />
            <TextField label="Correo" type="email" value={v.email} onChange={x => setV(s => ({ ...s, email: x }))} error={err.email} required />
            <TextField label="Teléfono" value={v.phone} onChange={x => setV(s => ({ ...s, phone: x }))} hint="Con prefijo, p. ej. +34600123456" />
          </div>
          <button className="h-btn primary" style={{ width: 'fit-content' }}>Guardar inquilino</button>
        </form></Disclosure>}
      {d.tenants.length === 0 ? <div style={{ marginTop: '1rem' }}><Empty title="Aún no hay inquilinos" hint="Añade a la primera persona y luego crea su contrato en la pestaña Contratos." /></div> : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
          {d.tenants.map(t => {
            const cs = d.contracts.filter(c => c.tenant_id === t.id)
            return (
              <section key={t.id} className="h-panel">
                <div className="flex flex-wrap justify-between gap-2"><div><h2>{t.full_name}</h2><p className="muted small">{t.email}{t.phone ? ` · ${t.phone}` : ''}</p></div>
                  {t.user_id ? <Badge tone="ok">Con acceso al portal</Badge> : <Badge>Sin cuenta</Badge>}</div>
                {cs.length === 0 && <p className="muted" style={{ marginTop: '.5rem' }}>Sin contrato todavía.</p>}
                {cs.map(c => {
                  const active = d.tenantLinks.find(l => l.contract_id === c.id && !l.revoked_at)
                  const url = link?.contractId === c.id ? link.url : null
                  return (
                    <div key={c.id} className="h-row" style={{ alignItems: 'flex-start' }}>
                      <span><strong>{roomLabel(d, c.room_id)}</strong><br /><span className="muted small">{c.starts_on} → {c.ends_on} · {c.status === 'active' ? 'Activo' : c.status === 'draft' ? 'Borrador' : c.status === 'ended' ? 'Terminado' : 'Pendiente de firma'}</span></span>
                      {canWrite && c.status !== 'ended' && (
                        <span style={{ display: 'grid', gap: '.5rem', justifyItems: 'end' }}>
                          <button className="h-btn sm" onClick={() => makeLink(c.id)}><QrIcon size={16} aria-hidden /> {active ? 'Regenerar enlace' : 'Crear enlace personal'}</button>
                          {active && !url && <span className="muted small">Enlace activo hasta {active.expires_at.slice(0, 10)}. Regenerarlo revoca el anterior.</span>}
                          {url && (
                            <span style={{ display: 'grid', gap: '.5rem', justifyItems: 'end' }}>
                              <a className="h-btn sm primary" target="_blank" rel="noreferrer" href={waLink(t.phone, welcomeMessage(t.full_name, url))}><MessageCircle size={16} aria-hidden /> Enviar acceso por WhatsApp</a>
                              <button className="h-btn sm" onClick={() => navigator.clipboard.writeText(url).then(() => notify('Enlace copiado'))}><Copy size={16} aria-hidden /> Copiar enlace</button>
                              <div className="h-print-block"><QrCode text={url} size={160} /></div>
                              <button className="h-btn sm" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir QR para la puerta</button>
                            </span>
                          )}
                          {active && <button className="h-btn sm danger" onClick={() => act(() => repo.revokeTenantLink(active.id), 'Enlace revocado')}>Revocar enlace</button>}
                        </span>
                      )}
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      )}
      <div style={{ marginTop: '1.25rem' }}><Notice>El enlace personal permite al inquilino avisar de averías, quejas o sugerencias sin crear cuenta. Solo se guarda su huella (hash); se muestra una vez.</Notice></div>
    </Page>
  )
}
