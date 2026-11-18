import { NextResponse } from 'next/server'
import { DEMO_COOKIE, DEMO_NAME_COOKIE, DEMO_ROLES, isDemo, type DemoRole } from '@/lib/hab/env'

// Acceso demo: solo con NEXT_PUBLIC_HAB_DEMO=1 y fuera de producción; en cualquier otro caso, 404.
// Solo guarda una cookie con el ROL simulado: no crea sesión de Supabase ni usuarios ni credenciales.
export function GET(req: Request) {
  if (!isDemo()) return new Response('Not found', { status: 404 })
  const url = new URL(req.url)
  const role = url.searchParams.get('role') ?? 'admin'
  const res = NextResponse.redirect(new URL(role === 'out' ? '/habitaciones/app/login' : url.searchParams.get('to') === 'portal' ? '/habitaciones/app' : '/habitaciones/app', url), 303)
  if (role === 'out') {
    res.cookies.delete(DEMO_COOKIE); res.cookies.delete(DEMO_NAME_COOKIE)
    return res
  }
  if (!DEMO_ROLES.includes(role as DemoRole)) return new Response('Rol no válido', { status: 400 })
  res.cookies.set(DEMO_COOKIE, role, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 8 })
  const name = url.searchParams.get('name')
  if (name) res.cookies.set(DEMO_NAME_COOKIE, encodeURIComponent(name.slice(0, 80)), { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 8 })
  else res.cookies.delete(DEMO_NAME_COOKIE)
  return res
}
