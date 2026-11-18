import { notFound } from 'next/navigation'
import { getServerSession } from '@/lib/hab/session'
import { Admin } from '@/components/hab/tabs/Admin'
import { Ajustes } from '@/components/hab/tabs/Ajustes'
import { Avisos } from '@/components/hab/tabs/Avisos'
import { Candidatos } from '@/components/hab/tabs/Candidatos'
import { Cobros } from '@/components/hab/tabs/Cobros'
import { Contratos } from '@/components/hab/tabs/Contratos'
import { Incidencias } from '@/components/hab/tabs/Incidencias'
import { Inquilinos } from '@/components/hab/tabs/Inquilinos'
import { Inventario } from '@/components/hab/tabs/Inventario'
import { Permisos } from '@/components/hab/tabs/Permisos'
import { Pisos } from '@/components/hab/tabs/Pisos'
import { Reportes } from '@/components/hab/tabs/Reportes'
import { Soporte } from '@/components/hab/tabs/Soporte'
import { Suministros } from '@/components/hab/tabs/Suministros'
import { Vender } from '@/components/hab/tabs/Vender'

const ORG_TABS: Record<string, () => JSX.Element> = {
  pisos: Pisos, candidatos: Candidatos, contratos: Contratos, inquilinos: Inquilinos, inventario: Inventario, cobros: Cobros, suministros: Suministros,
  incidencias: Incidencias, reportes: Reportes, avisos: Avisos, permisos: Permisos, ajustes: Ajustes, vender: Vender,
}

export const dynamic = 'force-dynamic'

export default async function TabPage({ params }: { params: { tab: string } }) {
  const s = await getServerSession()
  if (!s) notFound()
  if (params.tab === 'soporte') return <Soporte />
  if (params.tab === 'admin') { if (!s.platformAdmin) notFound(); return <Admin /> } // 404 si no es administrador de plataforma
  if (s.kind === 'tenant') notFound() // el inquilino solo ve su vista y Soporte
  const Tab = ORG_TABS[params.tab]
  if (!Tab || (params.tab === 'vender' && s.kind === 'subtenant')) notFound()
  return <Tab />
}
