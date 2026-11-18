'use client'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import Link from 'next/link'
import { Badge, Empty, Page, Segmented, Table, eur, fmtDate } from '../ui'
import { paymentStatus, todayStr } from '@/lib/hab/alerts'
import { contractTitle } from '@/lib/hab/reports'
import type { Payment } from '@/lib/hab/types'

const LABEL = { paid: 'Pagado', late: 'Atrasado', pending: 'Pendiente' } as const
const TONE = { paid: 'ok', late: 'warn', pending: 'info' } as const

export function Cobros() {
  const d = useSnap(); const { repo, act, session } = useHab()
  const [f, setF] = useState<'all' | 'late' | 'pending' | 'paid'>('late')
  if (!d) return <Loading />
  const today = todayStr()
  const rows = d.payments.filter(p => d.contracts.find(c => c.id === p.contract_id)?.status !== 'draft').map(p => ({ ...p, st: paymentStatus(p, today) }))
    .filter(p => f === 'all' || p.st === f).sort((a, b) => a.due_on.localeCompare(b.due_on))
  const canEdit = session.kind !== 'tenant'
  const receipt = (p: Payment) => {
    const w = window.open('', '_blank'); if (!w) return
    const title = contractTitle(d, p.contract_id)
    w.document.write(`<html lang="es"><title>Recibo</title><body style="font-family:sans-serif;max-width:520px;margin:2rem auto"><h1>Recibo de renta</h1><p>${title.replace(/</g, '&lt;')}</p><p>Importe: <b>${eur(p.amount_cents)}</b></p><p>Vencimiento: ${p.due_on} · Pagado el: ${p.paid_on} (${p.method ?? ''})</p><p style="color:#666;font-size:12px">Modelo generado con Vendoya Habitaciones. No es asesoría jurídica.</p></body></html>`)
    w.document.close(); w.print()
  }
  return (
    <Page title="Cobros" intro="Calendario de rentas por contrato. Marca como pagado cuando entre el dinero.">
      <div style={{ marginBottom: '1.25rem' }}>
        <Segmented label="Mostrar cobros" value={f} onChange={setF} options={[['late', 'Atrasados'], ['pending', 'Pendientes'], ['paid', 'Pagados'], ['all', 'Todos']]} />
      </div>
      {rows.length === 0 ? <Empty title={f === 'late' ? 'Nada atrasado' : 'Nada que mostrar'} hint={f === 'late' ? 'Ningún cobro vencido sin pagar. Buen momento para revisar los próximos.' : 'No hay cobros con este filtro. Los cobros aparecen al activar un contrato.'} action={f === 'all' ? <Link className="h-btn primary" href="/habitaciones/app/contratos">Ir a contratos</Link> : <button className="h-btn" onClick={() => setF('pending')}>Ver pendientes</button>} /> : (
        <Table rows={rows.slice(0, 80)} rowKey={p => p.id} cols={[
          { label: 'Contrato', render: p => contractTitle(d, p.contract_id) },
          { label: 'Vence', render: p => fmtDate(p.due_on) },
          { label: 'Importe', render: p => eur(p.amount_cents) },
          { label: 'Estado', render: p => <Badge tone={TONE[p.st]}>{LABEL[p.st]}</Badge> },
          { label: 'Acciones', render: p => p.paid_on
            ? <button className="h-btn sm" onClick={() => receipt(p)}>Recibo</button>
            : canEdit ? <button className="h-btn sm primary" onClick={() => act(() => repo.markPaid(p.id, 'transferencia', today), 'Marcado como pagado')}>Marcar pagado</button> : null },
        ]} />
      )}
      {rows.length > 80 && <p className="muted small" style={{ marginTop: '.75rem' }}>Se muestran los 80 primeros; usa el filtro para acotar.</p>}
    </Page>
  )
}
