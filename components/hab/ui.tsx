'use client'
import type { ReactNode } from 'react'
import { useId } from 'react'

export const eur = (cents: number | null | undefined) => (cents == null ? '—' : (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }))
export const fmtDate = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

// Ilustración de línea discreta: una ventana con luz y una planta. Solo decorativa.
export function Art({ className = 'art' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 120" fill="none" aria-hidden stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--h-line)' }}>
      <rect x="38" y="10" width="70" height="78" rx="6" /><path d="M73 10v78M38 49h70" />
      <path d="M44 94l60 0" style={{ color: 'var(--h-accent)' }} opacity=".5" />
      <path d="M126 96V76" style={{ color: 'var(--h-accent)' }} /><path d="M126 82c-10-1-14-9-13-17 9 1 14 8 13 17zM126 78c9-1 14-8 13-16-9 1-14 7-13 16z" style={{ color: 'var(--h-accent)' }} />
      <path d="M116 96h20l-3 14h-14z" />
    </svg>
  )
}

export function Help({ text }: { text: string }) {
  return <span className="h-help" role="img" aria-label={text} title={text}>?</span>
}

export function Page({ title, intro, actions, children }: { title: string; intro?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="h-rise">
      <header className="flex flex-wrap items-end justify-between gap-4" style={{ marginBottom: '2rem' }}>
        <div className="grid gap-2 max-w-2xl"><h1>{title}</h1>{intro && <p className="muted small">{intro}</p>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
  return <span className={`h-badge ${tone === 'neutral' ? '' : tone}`}>{children}</span>
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (id: string, invalid: boolean) => ReactNode }) {
  const id = useId()
  return (
    <label className="h-field" htmlFor={id}>
      <span>{label}</span>
      {children(id, !!error)}
      {hint && !error && <small className="muted">{hint}</small>}
      {error && <small className="err" role="alert">{error}</small>}
    </label>
  )
}

export function TextField({ label, value, onChange, type = 'text', error, hint, placeholder, required }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; error?: string; hint?: string; placeholder?: string; required?: boolean
}) {
  return (
    <Field label={label + (required ? ' *' : '')} error={error} hint={hint}>
      {(id, bad) => <input id={id} className="h-input" type={type} value={value} placeholder={placeholder} aria-invalid={bad} aria-required={required} onChange={e => onChange(e.target.value)} />}
    </Field>
  )
}

export function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <Field label={label}>
      {id => <select id={id} className="h-select" value={value} onChange={e => onChange(e.target.value as T)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
    </Field>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="h-check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{label}</label>
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return <div className="h-empty"><Art /><h3 style={{ color: 'var(--h-text)' }}>{title}</h3><p style={{ maxWidth: 440 }}>{hint}</p>{action}</div>
}

export function Notice({ tone, children }: { tone?: 'bad' | 'ok'; children: ReactNode }) {
  return <div className={`h-notice ${tone ?? ''}`} role={tone === 'bad' ? 'alert' : 'note'}>{children}</div>
}

export interface Col<T> { label: string; render: (row: T) => ReactNode; className?: string }
export function Table<T>({ cols, rows, rowKey }: { cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string }) {
  return (
    <table className="h-table">
      <thead><tr>{cols.map(c => <th key={c.label} scope="col">{c.label}</th>)}</tr></thead>
      <tbody>{rows.map(r => <tr key={rowKey(r)}>{cols.map((c, i) => <td key={c.label} data-label={c.label} className={[i === 0 ? 'h-main-cell' : '', c.label === 'Acciones' ? 'h-actions-cell' : '', c.className].filter(Boolean).join(' ') || undefined}>{c.render(r)}</td>)}</tr>)}</tbody>
    </table>
  )
}

// Filtro de una pulsación (sustituye a un desplegable de 2-4 opciones).
export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="group" aria-label={label} className="h-seg">
      {options.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  )
}

export function Disclosure({ summary, children, open }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="h-panel" open={open}>
      <summary style={{ cursor: 'pointer', fontWeight: 650, minHeight: 32 }}>{summary}</summary>
      <div style={{ marginTop: '1rem' }}>{children}</div>
    </details>
  )
}

// Convierte euros escritos por el usuario a céntimos enteros.
export const toCents = (v: string | number) => Math.round(Number(String(v).replace(',', '.')) * 100) || 0
export const fromCents = (c: number) => (c ? String(c / 100) : '')
