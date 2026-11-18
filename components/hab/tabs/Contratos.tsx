'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Copy, FileText, Upload } from 'lucide-react'
import { useHab } from '../HabProvider'
import { ContractWizard } from '../ContractWizard'
import { SignPanel } from '../SignPanel'
import { Loading, useSnap } from '../shared'
import { Badge, Empty, Notice, Page, Table, eur, fmtDate } from '../ui'
import { roomLabel } from '@/lib/hab/reports'
import { CATALOG_NOTICE, LEGAL_NOTICE } from '@/lib/hab/catalog'
import type { Contract } from '@/lib/hab/types'

const ST = { draft: 'Borrador', pending_signature: 'Pendiente de firma', active: 'Activo', ended: 'Terminado' } as const
const TONE = { draft: 'neutral', pending_signature: 'warn', active: 'ok', ended: 'neutral' } as const

export function Contratos() {
  const d = useSnap(); const { repo, act, session, notify } = useHab()
  const [wizard, setWizard] = useState<{ base?: Contract } | null>(null); const [signId, setSignId] = useState<string | null>(null)
  if (!d) return <Loading />
  const canWrite = session.role !== 'viewer'
  if (wizard) return <ContractWizard base={wizard.base} onClose={() => setWizard(null)} />
  const sign = async (c: Contract, f: File) => {
    try { const path = await repo.upload('hab-docs', f); await act(() => repo.setContractStatus(c.id, 'active', path), 'Contrato firmado subido: ahora está activo') } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo subir', 'bad') }
  }
  return (
    <Page title="Contratos" intro="Elige tú las cláusulas del catálogo; la app no te recomienda ninguna. Imprime, firma a mano y sube la foto o el escaneo."
      actions={canWrite && d.rooms.length > 0 ? <button className="h-btn primary" onClick={() => setWizard({})}><FileText size={18} aria-hidden /> Nuevo contrato</button> : undefined}>
      {d.contracts.length === 0 ? <Empty title="Aún no hay contratos" hint={d.rooms.length ? 'Crea el primero: el asistente te guía paso a paso y te avisa de lo que falte.' : 'Primero da de alta un piso con habitaciones.'} action={d.rooms.length ? (canWrite ? <button className="h-btn primary" onClick={() => setWizard({})}>Crear el primer contrato</button> : undefined) : <Link className="h-btn primary" href="/habitaciones/app/pisos">Dar de alta un piso</Link>} /> : (
        <Table rows={d.contracts} rowKey={c => c.id} cols={[
          { label: 'Habitación', render: c => roomLabel(d, c.room_id) }, { label: 'Inquilino', render: c => d.tenants.find(t => t.id === c.tenant_id)?.full_name ?? '' },
          { label: 'Periodo', render: c => `${fmtDate(c.starts_on)} → ${fmtDate(c.ends_on)}` }, { label: 'Renta', render: c => eur(c.rent_cents) },
          { label: 'Estado', render: c => <Badge tone={TONE[c.status]}>{ST[c.status]}</Badge> },
          { label: 'Acciones', render: c => canWrite ? (
            <span className="flex flex-wrap gap-2 justify-end">
              {c.status !== 'active' && c.status !== 'ended' && <label className="h-btn sm"><Upload size={14} aria-hidden /> Subir firmado<input type="file" hidden accept="application/pdf,image/jpeg,image/png" onChange={e => { const f = e.target.files?.[0]; if (f) void sign(c, f); e.target.value = '' }} /></label>}
              <button className="h-btn sm" title="Firma en pantalla desde el móvil del inquilino" aria-expanded={signId === c.id} onClick={() => setSignId(signId === c.id ? null : c.id)}>Firma electrónica</button>
              <button className="h-btn sm" onClick={() => setWizard({ base: c })}><Copy size={14} aria-hidden /> Duplicar</button>
              {c.status === 'active' && <button className="h-btn sm" onClick={() => act(() => repo.setContractStatus(c.id, 'ended'), 'Contrato terminado')}>Terminar</button>}
            </span>) : null },
        ]} />
      )}
      <div style={{ marginTop: '1.5rem' }}><Notice>{CATALOG_NOTICE}. {LEGAL_NOTICE}</Notice></div>
      {signId && d.contracts.find(c => c.id === signId) && <SignPanel contract={d.contracts.find(c => c.id === signId)!} />}
    </Page>
  )
}
