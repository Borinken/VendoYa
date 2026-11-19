'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { z } from 'zod'
import { ensureAccount } from '@/lib/hab/account'
import { isDemo } from '@/lib/hab/env'
import type { OrgKind } from '@/lib/hab/types'
import { LEGAL_NOTICE } from '@/lib/hab/catalog'
import { TextField, Notice } from './ui'

const KINDS: [OrgKind, string, string][] = [
  ['owner', 'Propietario', 'Gestiono mis propios pisos'],
  ['agency', 'Inmobiliaria o gestor', 'Gestiono pisos de varios propietarios'],
  ['subtenant', 'Subarrendador', 'Alquilo habitaciones de un piso que no es mío, con permiso del propietario'],
]
// La regla de 8 caracteres solo se exige al crear cuenta; al entrar decide Supabase (cuentas antiguas pueden tener contraseña más corta).
const credsFor = (registro: boolean) => z.object({ email: z.string().trim().email('Correo no válido'), password: registro ? z.string().min(8, 'Mínimo 8 caracteres') : z.string().min(1, 'Escribe tu contraseña') })

export function AuthForm({ mode }: { mode: 'login' | 'registro' }) {
  const router = useRouter()
  const demo = isDemo() // en producción es siempre false: ni botón ni ruta
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('')
  const [kind, setKind] = useState<OrgKind>('owner'); const [accept, setAccept] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({}); const [msg, setMsg] = useState<{ tone?: 'bad' | 'ok'; text: string } | null>(null); const [busy, setBusy] = useState(false)
  const reg = mode === 'registro'

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(null)
    const e2: Record<string, string> = {}
    const p = credsFor(mode === 'registro').safeParse({ email, password })
    if (!p.success) p.error.issues.forEach(i => { e2[String(i.path[0])] = i.message })
    if (reg && name.trim().length < 2) e2.name = 'Escribe un nombre (mín. 2 caracteres)'
    if (reg && !accept) e2.accept = 'Debes aceptar para continuar'
    setErrs(e2)
    if (Object.keys(e2).length && !demo) return
    if (demo) { // Demo: no hay credenciales; entra con el rol elegido.
      location.href = `/habitaciones/app/demo?role=${reg ? kind : 'owner'}${reg && name ? `&name=${encodeURIComponent(name)}` : ''}`; return
    }
    setBusy(true)
    try {
      const sb = createClientComponentClient()
      const invite = new URLSearchParams(location.search).get('invite')
      if (reg) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { hab_kind: kind, hab_org_name: name.trim() }, emailRedirectTo: `${location.origin}/habitaciones/app/login` } })
        if (error) throw error
        if (!data.session) { setMsg({ tone: 'ok', text: 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.' }); return }
        await ensureAccount(sb, invite)
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        await ensureAccount(sb, invite)
      }
      router.replace('/habitaciones/app'); router.refresh()
    } catch (err) {
      setMsg({ tone: 'bad', text: err instanceof Error ? err.message : 'No se pudo completar' })
    } finally { setBusy(false) }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }} className="h-rise">
      <p style={{ fontFamily: 'Bricolage, sans-serif', fontWeight: 700, color: 'var(--h-accent)' }}>Habitaciones · Vendoya</p>
      <h1 style={{ margin: '.5rem 0 1.5rem' }}>{reg ? 'Crea tu cuenta' : 'Entra a tu panel'}</h1>
      {demo && (
        <div className="h-panel" style={{ marginBottom: '1.5rem', display: 'grid', gap: '.75rem' }}>
          <Notice>Modo demo activo: datos de ejemplo, sin correo ni contraseña.</Notice>
          <a className="h-btn primary" href="/habitaciones/app/demo?role=admin">Entrar como administrador (demo)</a>
          <p className="muted small">Desde dentro puedes cambiar entre Propietario, Inmobiliaria, Subarrendador e Inquilino.</p>
        </div>
      )}
      <form onSubmit={submit} noValidate style={{ display: 'grid', gap: '1rem' }}>
        {reg && (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: '.5rem' }}>
              <legend className="muted small" style={{ marginBottom: '.4rem' }}>¿Cómo vas a usar la app?</legend>
              {KINDS.map(([k, label, hint]) => (
                <label key={k} className="h-panel" style={{ display: 'flex', gap: '.75rem', cursor: 'pointer', borderColor: kind === k ? 'var(--h-accent)' : undefined }}>
                  <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} style={{ accentColor: 'var(--h-accent-text)', marginTop: 4 }} />
                  <span><strong>{label}</strong><br /><span className="muted small">{hint}</span></span>
                </label>
              ))}
            </fieldset>
            <TextField label="Nombre (tuyo o de tu empresa)" value={name} onChange={setName} error={errs.name} required />
          </>
        )}
        <TextField label="Correo" type="email" value={email} onChange={setEmail} error={errs.email} required />
        <TextField label="Contraseña" type="password" value={password} onChange={setPassword} error={errs.password} hint={reg ? 'Mínimo 8 caracteres' : undefined} required />
        {reg && (
          <div>
            <label className="h-check"><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} />
              <span className="small">Entiendo que {LEGAL_NOTICE.toLowerCase()}</span></label>
            {errs.accept && <small className="err" style={{ color: 'var(--h-bad)' }} role="alert">{errs.accept}</small>}
          </div>
        )}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <button className="h-btn primary" disabled={busy} type="submit">{busy ? 'Un momento…' : reg ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
      <p className="muted small" style={{ marginTop: '1.25rem' }}>
        {reg ? <>¿Ya tienes cuenta? <Link href="/habitaciones/app/login">Entrar</Link></> : <>¿Primera vez? <Link href="/habitaciones/app/registro">Crear cuenta</Link></>}
      </p>
    </main>
  )
}
