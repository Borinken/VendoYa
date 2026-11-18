'use client'
import { useEffect, useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, download, useSnap } from '../shared'
import { Check, Notice, Page, TextField } from '../ui'
import { DEFAULT_AUTO_REPLY, DEFAULT_TEMPLATES, INCIDENT_CATEGORIES, settingsInput } from '@/lib/hab/types'
import { LEGAL_NOTICE } from '@/lib/hab/catalog'

export function Ajustes() {
  const d = useSnap(); const { repo, act, session } = useHab()
  const [name, setName] = useState(''); const [wa, setWa] = useState(''); const [auto, setAuto] = useState(''); const [tpl, setTpl] = useState<Record<string, string>>({})
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.querySelector('.hab')?.getAttribute('data-theme') === 'dark') }, [])
  const [err, setErr] = useState(''); const [confirm, setConfirm] = useState(''); const [copy, setCopy] = useState(false)
  useEffect(() => { if (d) { setName(d.org?.name ?? ''); setWa(d.settings?.whatsapp_e164 ?? ''); setAuto(d.settings?.auto_reply ?? ''); setTpl(d.settings?.templates ?? {}); setCopy(d.settings?.auto_email_copy === true) } }, [d])
  if (!d) return <Loading />
  const admin = session.role === 'admin'
  async function saveChannel(e: React.FormEvent) {
    e.preventDefault(); const r = settingsInput.safeParse({ whatsapp_e164: wa.trim(), templates: tpl, auto_reply: auto, auto_email_copy: copy })
    if (!r.success) { setErr(r.error.issues[0].message); return }
    setErr(''); await act(() => repo.saveSettings(r.data), 'Canal de inquilinos guardado')
  }
  return (
    <Page title="Ajustes">
      <section className="h-panel" style={{ display: 'grid', gap: '.5rem', marginBottom: '1.25rem' }}><h2>Apariencia</h2>
        <p className="muted">El panel es claro por defecto. Si te cansa la vista de noche, puedes oscurecerlo.</p>
        <Check label="Usar modo oscuro" checked={dark} onChange={v => { setDark(v); try { localStorage.setItem('hab_theme', v ? 'dark' : 'light') } catch { /* sin almacenamiento */ } const el = document.querySelector('.hab'); if (v) el?.setAttribute('data-theme', 'dark'); else el?.removeAttribute('data-theme') }} />
      </section>
      <section className="h-panel" style={{ display: 'grid', gap: '1rem' }}><h2>Mi organización</h2>
        <TextField label="Nombre" value={name} onChange={setName} />
        <button className="h-btn primary" style={{ width: 'fit-content' }} disabled={!admin} onClick={() => act(() => repo.updateOrg(name), 'Nombre guardado')}>Guardar</button></section>
      <form className="h-panel" onSubmit={saveChannel} noValidate style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
        <h2>Canal de inquilinos</h2>
        <p className="muted">Tus inquilinos avisan de averías, quejas y sugerencias desde su enlace personal. Si pones tu número de WhatsApp, podrán avisarte también por ahí. Sin API de WhatsApp: se abre la app del inquilino con el mensaje listo.</p>
        <TextField label="Tu número de WhatsApp (formato internacional)" value={wa} onChange={setWa} placeholder="+34600123456" hint="Déjalo vacío si no quieres botón de WhatsApp" />
        {INCIDENT_CATEGORIES.map(c => <TextField key={c} label={`Plantilla de mensaje: ${c}`} value={tpl[c] ?? ''} onChange={x => setTpl(s => ({ ...s, [c]: x }))} placeholder={DEFAULT_TEMPLATES[c]} hint="Variables: {nombre} {habitación} {código}" />)}
        <TextField label="Respuesta automática" value={auto} onChange={setAuto} placeholder={DEFAULT_AUTO_REPLY} hint="Se muestra tras enviar el aviso. Debe decir que es un asistente automático." />
        <Check label="Enviar copia automática a mi email cuando se firme un contrato" checked={copy} onChange={setCopy} />
        <p className="muted small">El inquilino recibe siempre el contrato firmado (si hay email configurado en el servidor). Esta casilla añade una copia para ti.</p>
        {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
        <button className="h-btn primary" style={{ width: 'fit-content' }} disabled={!admin}>Guardar canal</button>
      </form>
      <section className="h-panel" style={{ display: 'grid', gap: '.75rem', marginTop: '1.25rem' }}><h2>Mis datos</h2>
        <p className="muted">Descarga todo lo que tu organización tiene guardado en un archivo.</p>
        <button className="h-btn" style={{ width: 'fit-content' }} onClick={() => { download('mis-datos-habitaciones.json', JSON.stringify({ ...d, clauses: undefined }, null, 2), 'application/json') }}>Exportar mis datos</button></section>
      {admin && <section className="h-panel" style={{ display: 'grid', gap: '.75rem', marginTop: '1.25rem' }}><h2>Borrar cuenta</h2>
        <Notice tone="bad">Se borran la organización y todos sus pisos, contratos y registros. No se puede deshacer. Los archivos subidos se retiran aparte.</Notice>
        <TextField label="Escribe BORRAR para confirmar" value={confirm} onChange={setConfirm} />
        <button className="h-btn danger" style={{ width: 'fit-content' }} disabled={confirm !== 'BORRAR'} onClick={async () => { await act(() => repo.deleteAccount()); location.href = session.demo ? '/habitaciones/app/demo?role=out' : '/habitaciones/app/login' }}>Borrar mi cuenta</button></section>}
      <p className="muted small" style={{ marginTop: '1.25rem' }}>{LEGAL_NOTICE}</p>
    </Page>
  )
}
