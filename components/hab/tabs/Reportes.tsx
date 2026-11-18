'use client'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSnap, Loading, download } from '../shared'
import { Empty, Page, SelectField, Table, eur, fmtDate } from '../ui'
import { todayStr } from '@/lib/hab/alerts'
import { annualCsv, contractTitle, delinquents, incidentsByProperty, incomeSeries, occupancyByProperty, yieldByProperty } from '@/lib/hab/reports'

const AX = { stroke: 'var(--h-muted)', fontSize: 12 }
function Chart({ title, desc, children }: { title: string; desc: string; children: React.ReactElement }) {
  return (
    <section className="h-panel" aria-label={title}><h2>{title}</h2><p className="muted small" style={{ marginBottom: '.75rem' }}>{desc}</p>
      <div style={{ width: '100%', height: 240 }}><ResponsiveContainer>{children}</ResponsiveContainer></div></section>
  )
}
const tip = { contentStyle: { background: 'var(--h-surface)', border: '1px solid var(--h-line)', borderRadius: 10, color: 'var(--h-text)' }, cursor: { fill: 'var(--h-raised)' } }

export function Reportes() {
  const d = useSnap(); const [year, setYear] = useState(todayStr().slice(0, 4))
  if (!d) return <Loading />
  if (!d.properties.length) return <Page title="Reportes"><Empty title="Aún no hay datos" hint="Cuando haya pisos, contratos y cobros verás aquí ocupación, ingresos y morosidad." /></Page>
  const today = todayStr()
  const inc = incomeSeries(d, today).map(r => ({ mes: r.month, Previsto: r.expected / 100, Cobrado: r.collected / 100 }))
  const occ = occupancyByProperty(d); const inc2 = incidentsByProperty(d); const late = delinquents(d, today)
  const yld = yieldByProperty(d, year).map(r => ({ name: r.name, 'Cobrado (€)': r.cents / 100 }))
  const years = Array.from(new Set([today.slice(0, 4), ...d.payments.map(p => p.due_on.slice(0, 4))])).sort().reverse()
  return (
    <Page title="Reportes" actions={<button className="h-btn" onClick={() => download(`informe-anual-${year}.csv`, annualCsv(d, year), 'text/csv;charset=utf-8')}>Descargar informe anual {year} (CSV)</button>}>
      <div style={{ maxWidth: 200, marginBottom: '1rem' }}><SelectField label="Año del informe" value={year} onChange={setYear} options={years.map(y => [y, y] as [string, string])} /></div>
      <div className="h-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>
        <Chart title="Ingresos vs previstos" desc="Últimos 6 meses, en euros.">
          <BarChart data={inc}><CartesianGrid stroke="var(--h-line-soft)" vertical={false} /><XAxis dataKey="mes" {...AX} /><YAxis {...AX} width={48} /><Tooltip {...tip} /><Legend formatter={(v) => <span style={{ color: 'var(--h-text)' }}>{v}</span>} />
            <Bar dataKey="Previsto" fill="var(--h-chart-2)" radius={[4, 4, 0, 0]} /><Bar dataKey="Cobrado" fill="var(--h-accent)" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Ocupación por piso" desc="Porcentaje de habitaciones ocupadas.">
          <BarChart data={occ}><CartesianGrid stroke="var(--h-line-soft)" vertical={false} /><XAxis dataKey="name" {...AX} /><YAxis {...AX} domain={[0, 100]} width={40} /><Tooltip {...tip} /><Bar dataKey="pct" name="Ocupación %" fill="var(--h-accent)" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
        <Chart title="Incidencias por piso" desc="Total y abiertas.">
          <BarChart data={inc2}><CartesianGrid stroke="var(--h-line-soft)" vertical={false} /><XAxis dataKey="name" {...AX} /><YAxis {...AX} allowDecimals={false} width={32} /><Tooltip {...tip} /><Legend formatter={(v) => <span style={{ color: 'var(--h-text)' }}>{v}</span>} />
            <Bar dataKey="total" name="Total" fill="var(--h-chart-2)" radius={[4, 4, 0, 0]} /><Bar dataKey="open" name="Abiertas" fill="var(--h-bad)" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
        <Chart title={`Ingresos cobrados por piso (${year})`} desc="Suma de lo cobrado en el año; no descuenta gastos.">
          <BarChart data={yld}><CartesianGrid stroke="var(--h-line-soft)" vertical={false} /><XAxis dataKey="name" {...AX} /><YAxis {...AX} width={48} /><Tooltip {...tip} /><Bar dataKey="Cobrado (€)" fill="var(--h-accent)" radius={[4, 4, 0, 0]} /></BarChart>
        </Chart>
      </div>
      <section className="h-section"><h2>Morosidad</h2>
        {late.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Sin cobros atrasados.</p> : (
          <Table rows={late} rowKey={l => l.contractId} cols={[{ label: 'Contrato', render: l => contractTitle(d, l.contractId) }, { label: 'Cuotas', render: l => String(l.count) }, { label: 'Importe', render: l => eur(l.cents) }, { label: 'Desde', render: l => fmtDate(l.oldest) }]} />
        )}</section>
    </Page>
  )
}
