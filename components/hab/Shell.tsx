'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, Bell, Building2, ClipboardList, FileText, Home, KeyRound, LayoutDashboard, LifeBuoy, Menu, Settings, Shield, Tag, UserCheck, Users, Wallet, Wrench, Zap, X, LogOut } from 'lucide-react'
import { useHab } from './HabProvider'
import { delinquents } from '@/lib/hab/reports'
import { todayStr } from '@/lib/hab/alerts'
import { DEMO_ROLES, type DemoRole } from '@/lib/hab/env'
import { resetDemoData } from '@/lib/hab/demo-repo'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type Item = { slug: string; label: string; icon: typeof Home }
// Pestañas de uso diario en la barra inferior; el resto va agrupado en «Más».
const DAILY = ['', 'cobros', 'incidencias', 'contratos']
const MANAGE = ['pisos', 'inquilinos', 'candidatos', 'inventario', 'suministros']
const ORG_NAV: Item[] = [
  { slug: '', label: 'Resumen', icon: LayoutDashboard }, { slug: 'pisos', label: 'Pisos y habitaciones', icon: Building2 },
  { slug: 'contratos', label: 'Contratos', icon: FileText }, { slug: 'inquilinos', label: 'Inquilinos', icon: Users }, { slug: 'candidatos', label: 'Candidatos', icon: UserCheck },
  { slug: 'inventario', label: 'Inventario', icon: ClipboardList }, { slug: 'cobros', label: 'Cobros', icon: Wallet },
  { slug: 'suministros', label: 'Suministros', icon: Zap }, { slug: 'incidencias', label: 'Incidencias', icon: Wrench },
  { slug: 'reportes', label: 'Reportes', icon: BarChart3 }, { slug: 'avisos', label: 'Avisos', icon: Bell },
  { slug: 'permisos', label: 'Permisos y equipo', icon: KeyRound }, { slug: 'ajustes', label: 'Ajustes', icon: Settings },
  { slug: 'soporte', label: 'Soporte', icon: LifeBuoy },
]
const TENANT_NAV: Item[] = [{ slug: '', label: 'Mi habitación', icon: Home }, { slug: 'soporte', label: 'Soporte', icon: LifeBuoy }]
const ROLE_LABEL: Record<DemoRole, string> = { owner: 'Propietario', agency: 'Inmobiliaria', subtenant: 'Subarrendador', tenant: 'Inquilino', admin: 'Administrador' }

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, data } = useHab()
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const base = '/habitaciones/app'
  const items = session.kind === 'tenant' ? TENANT_NAV : [
    ...ORG_NAV,
    ...(session.kind === 'subtenant' ? [] : [{ slug: 'vender', label: 'Vender', icon: Tag }]),
    ...(session.platformAdmin ? [{ slug: 'admin', label: 'Plataforma', icon: Shield }] : []),
  ]
  const current = (slug: string) => (slug === '' ? path === base : path === `${base}/${slug}`)
  const openAlerts = data ? data.incidents.filter(i => i.status !== 'resolved').length : 0
  const demoRole = session.demo ? (session.platformAdmin ? 'admin' : session.kind) as DemoRole : null

  const lateCount = data ? delinquents(data, todayStr()).length : 0
  const counts: Record<string, number> = { incidencias: openAlerts, cobros: lateCount }
  const groups: [string, Item[]][] = session.kind === 'tenant' ? [['', items]] : [
    ['Cada día', DAILY.flatMap(sl => items.filter(i => i.slug === sl))],
    ['Gestión', items.filter(i => MANAGE.includes(i.slug))],
    ['Más', items.filter(i => !DAILY.includes(i.slug) && !MANAGE.includes(i.slug))],
  ]
  const Nav = ({ onGo }: { onGo?: () => void }) => (
    <nav className="h-nav" aria-label="Secciones">
      {groups.map(([g, list]) => (
        <div key={g || 'all'} role="group" aria-label={g || undefined} style={{ display: 'grid', gap: '.15rem' }}>
          {g && <p className="grp">{g}</p>}
          {list.map(({ slug, label, icon: Icon }) => (
            <Link key={slug} href={slug ? `${base}/${slug}` : base} aria-current={current(slug) ? 'page' : undefined} onClick={onGo}>
              <Icon size={19} aria-hidden /> {label}
              {counts[slug] > 0 && <span className="cnt" aria-label={`${counts[slug]} pendientes`}>{counts[slug]}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
  const signOut = async () => {
    if (session.demo) { location.href = `${base}/demo?role=out`; return }
    await createClientComponentClient().auth.signOut(); location.href = `${base}/login`
  }
  const bottom = session.kind === 'tenant' ? items : DAILY.flatMap(sl => items.filter(i => i.slug === sl))

  return (
    <>
      <a className="h-skip" href="#contenido">Saltar al contenido</a>
      {session.demo && (
        <div className="h-banner h-noprint" role="status">
          <strong>Modo demo: datos de ejemplo</strong>
          <span aria-hidden>·</span><span>Ver como:</span>
          {DEMO_ROLES.map(r => (
            <a key={r} href={`${base}/demo?role=${r}`} aria-current={demoRole === r ? 'true' : undefined}>{ROLE_LABEL[r]}</a>
          ))}
          <button onClick={() => { resetDemoData(); location.reload() }}>Reiniciar datos</button>
        </div>
      )}
      <div className="h-shell">
        <aside className="h-side h-noprint">
          <div style={{ padding: '0 .75rem 1rem' }}>
            <p style={{ fontFamily: 'Bricolage, sans-serif', fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-.02em' }}>Habitaciones</p>
            <p className="muted small" style={{ overflowWrap: 'anywhere' }}>{session.name}</p>
          </div>
          <Nav />
          <button className="h-btn quiet sm" style={{ margin: '1rem .75rem 0' }} onClick={signOut}><LogOut size={16} aria-hidden /> Salir</button>
        </aside>
        <main id="contenido" className="h-main">{children}</main>
      </div>
      <div className="h-bottom h-noprint">
        {bottom.map(({ slug, label, icon: Icon }) => (
          <Link key={slug} href={slug ? `${base}/${slug}` : base} aria-current={current(slug) ? 'page' : undefined}><Icon size={22} aria-hidden />{label.split(' ')[0]}{counts[slug] > 0 && <span className="cnt" aria-label={`${counts[slug]} pendientes`}>{counts[slug]}</span>}</Link>
        ))}
        {session.kind !== 'tenant' && <button onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><Menu size={22} aria-hidden />Más</button>}
      </div>
      {open && (
        <div className="h-drawer h-noprint" role="dialog" aria-modal="true" aria-label="Menú" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}>
          <div>
            <button className="h-btn quiet sm" onClick={() => setOpen(false)} autoFocus style={{ marginBottom: '.5rem' }}><X size={16} aria-hidden /> Cerrar</button>
            <Nav onGo={() => setOpen(false)} />
            <button className="h-btn quiet sm" style={{ margin: '1rem .75rem 0' }} onClick={signOut}><LogOut size={16} aria-hidden /> Salir</button>
          </div>
        </div>
      )}
    </>
  )
}
