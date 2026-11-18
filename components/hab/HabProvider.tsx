'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { HabRepo } from '@/lib/hab/repo'
import { createDemoRepo } from '@/lib/hab/demo-repo'
import { createSupabaseRepo } from '@/lib/hab/supabase-repo'
import type { Session, Snapshot } from '@/lib/hab/types'

interface Ctx {
  session: Session; repo: HabRepo; data: Snapshot | null; error: string | null
  reload: () => Promise<void>
  // Ejecuta un cambio, recarga los datos y avisa del resultado. Devuelve false si falla.
  act: <T>(fn: () => Promise<T>, okMsg?: string) => Promise<T | undefined>
  notify: (msg: string, tone?: 'ok' | 'bad') => void
}
const C = createContext<Ctx | null>(null)
export const useHab = () => { const c = useContext(C); if (!c) throw new Error('useHab fuera de HabProvider'); return c }

export function HabProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const repo = useMemo(() => (session.demo ? createDemoRepo(session) : createSupabaseRepo(session)), [session])
  const [data, setData] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; tone: 'ok' | 'bad' } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const reload = useCallback(async () => {
    try { setData(await repo.load()); setError(null) } catch (e) { setError(e instanceof Error ? e.message : 'Error al cargar') }
  }, [repo])
  useEffect(() => { void reload() }, [reload])
  useEffect(() => { try { if (localStorage.getItem('hab_theme') === 'dark') document.querySelector('.hab')?.setAttribute('data-theme', 'dark') } catch { /* sin almacenamiento: queda el modo claro */ } }, [])

  const notify = useCallback((msg: string, tone: 'ok' | 'bad' = 'ok') => {
    setToast({ msg, tone }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 4000)
  }, [])
  const act = useCallback(async <T,>(fn: () => Promise<T>, okMsg?: string) => {
    try { const r = await fn(); await reload(); if (okMsg) notify(okMsg); return r } catch (e) {
      notify(e instanceof Error ? e.message.replace(/^\[[\s\S]*\]$/, 'Revisa los campos del formulario') : 'No se pudo completar', 'bad'); return undefined
    }
  }, [reload, notify])

  return (
    <C.Provider value={{ session, repo, data, error, reload, act, notify }}>
      {children}
      <div aria-live="polite" className="h-noprint" style={{ position: 'fixed', left: 0, right: 0, bottom: 72, display: 'grid', justifyItems: 'center', zIndex: 70, pointerEvents: 'none' }}>
        {toast && <div className={`h-notice ${toast.tone === 'bad' ? 'bad' : 'ok'}`} style={{ pointerEvents: 'auto', background: 'var(--h-surface)', boxShadow: '0 6px 20px rgba(31,42,48,.10)', maxWidth: 'min(92vw, 520px)' }}>{toast.msg}</div>}
      </div>
    </C.Provider>
  )
}
