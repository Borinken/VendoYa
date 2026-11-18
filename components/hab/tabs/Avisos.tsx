'use client'
import { Check } from 'lucide-react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Badge, Empty, Page, fmtDate } from '../ui'
import { computeAlerts, todayStr } from '@/lib/hab/alerts'

export function Avisos() {
  const d = useSnap(); const { repo, act } = useHab()
  if (!d) return <Loading />
  const alerts = computeAlerts({ today: todayStr(), ...d })
  return (
    <Page title="Avisos" intro="Rentas, fin de contrato, fianza y tope de renta. Puedes descartar cada aviso cuando lo hayas atendido.">
      {alerts.length === 0 ? <Empty title="Sin avisos" hint="Cuando se acerque un cobro, un fin de contrato o se supere el tope de renta, lo verás aquí." /> : (
        <div className="h-panel">{alerts.map(a => (
          <div className="h-row" key={a.key}>
            <span><strong>{a.title}</strong><br /><span className="muted small">{a.detail}</span></span>
            <span className="flex items-center gap-2"><Badge tone={a.level === 'danger' ? 'bad' : a.level === 'warn' ? 'warn' : 'info'}>{fmtDate(a.due_on)}</Badge>
              <button className="h-btn sm" onClick={() => act(() => repo.dismissAlert(a.key), 'Aviso descartado')} aria-label={`Descartar: ${a.title}`}><Check size={16} aria-hidden /> Descartar</button></span>
          </div>
        ))}</div>
      )}
    </Page>
  )
}
