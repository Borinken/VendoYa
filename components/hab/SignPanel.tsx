'use client'
import { useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { useHab } from './HabProvider'
import { Loading, useSnap } from './shared'
import { Badge, Notice, TextField, fmtDate } from './ui'
import { demoSamplePdf } from '@/lib/hab/demo-repo'
import { SIGN_LAWYER_NOTE, SIGN_LEGAL_TEXT } from '@/lib/hab/seal-pdf'
import { waLink } from '@/lib/hab/whatsapp'
import type { Contract, SignRole } from '@/lib/hab/types'

const ROLE: Record<SignRole, string> = { landlord: 'Propietario / gestor', tenant: 'Inquilino' }

// Estado de firma electrónica simple de un contrato y acciones del propietario (crear, reenviar, invalidar, descargar).
export function SignPanel({ contract: c }: { contract: Contract }) {
  const d = useSnap(); const { repo, act, notify, session } = useHab()
  const tenant = d?.tenants.find(t => t.id === c.tenant_id)
  const [lName, setLName] = useState(d?.org?.name ?? session.name); const [lMail, setLMail] = useState(session.email)
  const [tName, setTName] = useState(tenant?.full_name ?? ''); const [tMail, setTMail] = useState(tenant?.email ?? '')
  const [links, setLinks] = useState<{ role: SignRole; url: string }[]>([]); const [dl, setDl] = useState('')
  if (!d) return <Loading />
  const reqs = d.signRequests.filter(r => r.contract_id === c.id && !r.revoked_at); const sigs = d.signatures.filter(g => g.contract_id === c.id)
  const mails = d.mailLog.filter(m => m.contract_id === c.id && m.kind === 'sealed')
  const done = !!c.sealed_pdf_path
  const create = async () => {
    if (!tMail.trim()) { notify('Falta el email del inquilino: añádelo para enviar el enlace de firma', 'bad'); return }
    const r = await act(() => repo.createSignRequests(c.id, [{ role: 'landlord', name: lName, email: lMail }, { role: 'tenant', name: tName, email: tMail }]), 'Enlaces de firma creados (los anteriores quedan invalidados)')
    if (r) setLinks(r.map(x => ({ role: x.role, url: `${location.origin}/habitaciones/f/${x.token}` })))
  }
  const resend = async () => { const t = await act(() => repo.createDownloadLink(c.id), 'Enlace de descarga creado (el anterior queda invalidado)'); if (t) setDl(`${location.origin}/habitaciones/d/${t}`) }
  const openSealed = async () => { const u = c.sealed_pdf_path ? await repo.fileUrl('hab-docs', c.sealed_pdf_path) : null; if (u) window.open(u, '_blank', 'noreferrer'); else notify('No se pudo abrir el PDF sellado', 'bad') }
  return (
    <section className="h-panel" aria-label="Firma electrónica" style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
      <h2>Firma electrónica del contrato</h2>
      <Notice>{SIGN_LEGAL_TEXT} {SIGN_LAWYER_NOTE} Sigues pudiendo imprimir, firmar a mano y subir el escaneo.</Notice>
      {!c.shared_pdf_path ? (
        <div style={{ display: 'grid', gap: '.5rem' }}><p className="muted">Primero hay que generar el PDF: en el asistente (Duplicar o Nuevo contrato), paso 8, pulsa «Preparar para firma en pantalla».</p>
          {session.demo && <button className="h-btn sm" style={{ width: 'fit-content' }} onClick={() => act(() => demoSamplePdf(c.id, repo), 'PDF de ejemplo preparado (demo)')}>Usar un PDF de ejemplo (solo demo)</button>}</div>
      ) : (
        <>
          <div>{(['landlord', 'tenant'] as SignRole[]).map(role => {
            const sig = sigs.find(g => g.role === role); const rq = reqs.filter(r => r.role === role).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
            return <div className="h-row" key={role}><span>{ROLE[role]}{sig ? <span className="muted small"> · {sig.signer_name}</span> : rq ? <span className="muted small"> · enlace hasta {fmtDate(rq.expires_at)}</span> : null}</span>
              <Badge tone={sig ? 'ok' : 'neutral'}>{sig ? `Firmado ${fmtDate(sig.signed_at)}` : rq ? 'Pendiente' : 'Sin enlace'}</Badge></div>
          })}</div>
          {!done && (
            <div style={{ display: 'grid', gap: '.75rem' }}>
              <div className="h-grid"><TextField label="Propietario: nombre" value={lName} onChange={setLName} /><TextField label="Propietario: email (para su copia)" value={lMail} onChange={setLMail} />
                <TextField label="Inquilino: nombre" value={tName} onChange={setTName} required /><TextField label="Inquilino: email" value={tMail} onChange={setTMail} required hint="Sale de su ficha; si falta, escríbelo" /></div>
              <div className="flex flex-wrap gap-2"><button className="h-btn primary" onClick={create}>{reqs.length ? 'Reenviar: crear enlaces nuevos' : 'Crear enlaces de firma'}</button>
                {reqs.some(r => !r.used_at) && <button className="h-btn danger" onClick={() => act(() => repo.invalidateSignRequests(c.id), 'Enlaces invalidados')}>Invalidar enlaces</button>}</div>
              {links.map(l => (
                <div key={l.role} className="flex flex-wrap items-center gap-2"><strong className="small">{ROLE[l.role]}:</strong><code className="small" style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{l.url}</code>
                  <button className="h-btn sm" onClick={() => navigator.clipboard.writeText(l.url).then(() => notify('Enlace copiado'))}><Copy size={14} aria-hidden /> Copiar</button>
                  <a className="h-btn sm" target="_blank" rel="noreferrer" href={waLink(l.role === 'tenant' ? tenant?.phone ?? '' : '', `Hola, aquí tienes el enlace para firmar el contrato (caduca en 7 días): ${l.url}`)}><MessageCircle size={14} aria-hidden /> Enviar por WhatsApp</a></div>
              ))}
            </div>
          )}
          {done && (
            <div style={{ display: 'grid', gap: '.75rem' }}>
              <Notice tone="ok">Firmado por todas las partes: el contrato está activo.</Notice>
              <div className="flex flex-wrap gap-2"><button className="h-btn primary" onClick={openSealed}>Descargar PDF sellado</button><button className="h-btn" onClick={resend}>Reenviar a las partes</button></div>
              {dl && <div className="flex flex-wrap items-center gap-2"><code className="small" style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{dl}</code>
                <button className="h-btn sm" onClick={() => navigator.clipboard.writeText(dl).then(() => notify('Enlace copiado'))}><Copy size={14} aria-hidden /> Copiar</button>
                <a className="h-btn sm" target="_blank" rel="noreferrer" href={waLink(tenant?.phone ?? '', `Hola ${tenant?.full_name ?? ''}, aquí tienes tu contrato firmado (el enlace caduca a los 30 días): ${dl}`)}><MessageCircle size={14} aria-hidden /> WhatsApp al inquilino</a></div>}
              {mails.length > 0 && <p className="muted small">Envíos automáticos por email: {mails.map(m => `${m.to_role === 'tenant' ? 'inquilino' : 'propietario'} ${m.status === 'sent' ? 'enviado' : 'fallido'}`).join(' · ')}.</p>}
            </div>
          )}
        </>
      )}
    </section>
  )
}
