import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { DEMO_COOKIE, DEMO_NAME_COOKIE, DEMO_ROLES, assertDemoAllowed, isDemo, type DemoRole } from './env'
import { demoSessionFor } from './demo-repo'
import type { OrgKind, Session } from './types'

// Sesión del servidor. En demo es la simulada del demoRepo (cookie con el rol, nunca una sesión real de Supabase).
export async function getServerSession(): Promise<Session | null> {
  assertDemoAllowed()
  if (isDemo()) {
    const jar = cookies()
    const role = jar.get(DEMO_COOKIE)?.value as DemoRole | undefined
    if (!role || !DEMO_ROLES.includes(role)) return null
    const name = jar.get(DEMO_NAME_COOKIE)?.value
    return demoSessionFor(role, name ? decodeURIComponent(name).slice(0, 80) : undefined)
  }
  try {
    const sb = createServerComponentClient({ cookies })
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data: m } = await sb.from('hab_members').select('role, org:hab_orgs(id, name, kind)').eq('user_id', user.id).limit(1).maybeSingle()
    const { data: admin } = await sb.rpc('hab_is_platform_admin')
    const platformAdmin = admin === true
    if (m) {
      const org = (Array.isArray(m.org) ? m.org[0] : m.org) as { id: string; name: string; kind: OrgKind }
      return { userId: user.id, email: user.email ?? '', name: org.name, kind: org.kind, orgId: org.id, role: m.role, tenantId: null, demo: false, platformAdmin }
    }
    const { data: t } = await sb.from('hab_tenants').select('id, full_name').eq('user_id', user.id).limit(1).maybeSingle()
    if (t) return { userId: user.id, email: user.email ?? '', name: t.full_name, kind: 'tenant', orgId: null, role: 'tenant', tenantId: t.id, demo: false, platformAdmin: false }
    return null // registrado pero sin organización: vuelve a /registro
  } catch {
    return null
  }
}
