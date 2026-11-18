'use client'
import { useEffect, useRef, useState } from 'react'
import { Download, MessageCircle, Share2 } from 'lucide-react'
import { demoDownloadUrl, demoSignInfo, demoSignPdfUrl, demoSignSubmit } from '@/lib/hab/demo-repo'
import { isDemo } from '@/lib/hab/env'
import { SIGN_CONSENT_TEXT, SIGN_LAWYER_NOTE, SIGN_LEGAL_TEXT } from '@/lib/hab/seal-pdf'
import { signInput, type SignInfo, type SignResult } from '@/lib/hab/types'
import { waLink } from '@/lib/hab/whatsapp'
import { Check, Notice, TextField } from './ui'

// Página pública (móvil primero) para firmar con firma electrónica simple: enlace único + consentimiento (+ código por email si hay envío).
export function SignForm({ token }: { token: string }) {
  const demo = isDemo()
  const [info, setInfo] = useState<SignInfo | null | undefined>(undefined); const [name, setName] = useState(''); const [consent, setConsent] = useState(false); const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [res, setRes] = useState<SignResult | null>(null); const [drawn, setDrawn] = useState(false)
  const cv = useRef<HTMLCanvasElement>(null); const last = useRef<{ x: number; y: number } | null>(null); const pts = useRef(0)
  useEffect(() => { (async () => { const i = demo ? demoSignInfo(token) : await fetch(`/habitaciones/f/${token}/api`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)); setInfo(i); if (i?.signer_name) setName(i.signer_name) })() }, [token, demo])

  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * cv.current!.width, y: ((e.clientY - r.top) / r.height) * cv.current!.height } }
  const down = (e: React.PointerEvent) => { cv.current!.setPointerCapture(e.pointerId); last.current = pos(e) }
  const move = (e: React.PointerEvent) => {
    if (!last.current) return; const c = cv.current!.getContext('2d')!; const p = pos(e)
    c.strokeStyle = '#111'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(last.current.x, last.current.y); c.lineTo(p.x, p.y); c.stroke(); last.current = p; pts.current++; if (pts.current > 8) setDrawn(true)
  }
  const clear = () => { const c = cv.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); pts.current = 0; setDrawn(false) }

  async function sendCode() {
    setBusy(true); setErr('')
    try { const r = await fetch(`/habitaciones/f/${token}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'code' }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setCodeSent(true) } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo enviar el código') } finally { setBusy(false) }
  }
  async function sign() {
    setErr('')
    const body = { name, consent, signature: drawn ? cv.current!.toDataURL('image/png') : '', ...(info?.mail_enabled ? { code } : {}) }
    const v = signInput.safeParse(body); if (!v.success) { setErr(v.error.issues[0].message); return }
    setBusy(true)
    try {
      if (demo) setRes(await demoSignSubmit(token, v.data))
      else { const r = await fetch(`/habitaciones/f/${token}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v.data) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setRes(j) }
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo firmar') } finally { setBusy(false) }
  }
  const dlUrl = (t: string) => (demo ? demoDownloadUrl(t) ?? '#' : `/habitaciones/d/${t}`)
  async function share(t: string) {
    const url = location.origin + `/habitaciones/d/${t}`
    try { if (!demo) { const blob = await (await fetch(dlUrl(t))).blob(); const f = new File([blob], 'contrato-firmado.pdf', { type: 'application/pdf' }); if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f], title: 'Contrato firmado' }); return } } } catch { /* usa wa.me */ }
    window.open(waLink('', `Aquí tienes el contrato firmado: ${url}`).replace('wa.me/?', 'wa.me/?'), '_blank', 'noreferrer')
  }

  if (info === undefined) return <main style={{ padding: '2rem' }}><p className="muted" role="status">Cargando…</p></main>
  if (!info) return <main style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem' }}><h1>Enlace no válido</h1><p className="muted" style={{ marginTop: '.75rem' }}>Este enlace de firma ya se usó, caducó o fue invalidado. Pide uno nuevo a quien te lo envió.</p></main>
  if (res) return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1.25rem' }} className="h-rise"><h1>Firma registrada</h1>
      <p className="muted" style={{ margin: '.75rem 0' }}>{res.all_signed ? 'Han firmado todas las partes. El contrato queda activo.' : 'Gracias. Cuando firme la otra parte, el contrato quedará sellado.'}</p>
      {res.download_token && <div style={{ display: 'grid', gap: '.6rem' }}>
        <a className="h-btn primary" href={dlUrl(res.download_token)} download={demo ? 'contrato.pdf' : undefined}><Download size={18} aria-hidden /> Descargar contrato</a>
        <button className="h-btn" onClick={() => share(res.download_token!)}>{typeof navigator !== 'undefined' && 'share' in navigator ? <Share2 size={18} aria-hidden /> : <MessageCircle size={18} aria-hidden />} Enviar por WhatsApp</button></div>}
      {res.simulated_emails && res.simulated_emails.length > 0 && <div style={{ marginTop: '1rem' }}><Notice tone="ok">Simulación (demo): se enviaría el contrato sellado por email a — {res.simulated_emails.join(' · ')}. Mensaje automático.</Notice></div>}
      <p className="muted small" style={{ marginTop: '1.5rem' }}>{SIGN_LEGAL_TEXT}</p></main>
  )
  const pdf = demo ? demoSignPdfUrl(token) : `/habitaciones/f/${token}/pdf`
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '1.25rem 1.25rem 4rem' }} className="h-rise">
      <p style={{ fontFamily: 'Bricolage, sans-serif', fontWeight: 700, color: 'var(--h-accent)' }}>Firma del contrato</p>
      <h1 style={{ margin: '.4rem 0' }}>{info.role === 'landlord' ? 'Parte arrendadora' : 'Parte arrendataria'}</h1>
      <p className="muted">{info.contract_title} · {info.org_name}</p>
      {pdf && <iframe title="Contrato" src={pdf} style={{ width: '100%', height: 420, marginTop: '1rem', border: '1px solid var(--h-line)', borderRadius: 12, background: '#fff' }} />}
      {pdf && <a className="small" href={pdf} target="_blank" rel="noreferrer">Abrir el contrato en otra pestaña</a>}
      <div className="h-panel" style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
        <Check label="He leído y acepto" checked={consent} onChange={setConsent} />
        <p className="muted small">{SIGN_CONSENT_TEXT}</p>
        <TextField label="Tu nombre completo" value={name} onChange={setName} required />
        <div><p className="muted small" style={{ marginBottom: '.4rem' }}>Dibuja tu firma con el dedo o el ratón *</p>
          <canvas ref={cv} width={600} height={220} aria-label="Zona para dibujar la firma" onPointerDown={down} onPointerMove={move} onPointerUp={() => { last.current = null }} onPointerCancel={() => { last.current = null }}
            style={{ width: '100%', height: 150, background: '#fff', borderRadius: 12, touchAction: 'none', border: '1px solid var(--h-line)' }} />
          <button type="button" className="h-btn sm quiet" onClick={clear}>Borrar firma</button></div>
        {info.mail_enabled && <div style={{ display: 'grid', gap: '.5rem' }}><button type="button" className="h-btn sm" style={{ width: 'fit-content' }} disabled={busy} onClick={sendCode}>{codeSent ? 'Reenviar código' : 'Enviar código a mi email'}</button>
          <TextField label="Código de 6 dígitos" value={code} onChange={setCode} /></div>}
        {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
        <button className="h-btn primary" disabled={busy} onClick={sign}>{busy ? 'Firmando…' : 'Firmar contrato'}</button>
      </div>
      <p className="muted small" style={{ marginTop: '1.25rem' }}>{SIGN_LEGAL_TEXT} {SIGN_LAWYER_NOTE}</p>
    </main>
  )
}
