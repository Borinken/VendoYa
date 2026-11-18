import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/hab/session'
import { HabProvider } from '@/components/hab/HabProvider'
import { Shell } from '@/components/hab/Shell'

export const dynamic = 'force-dynamic'

// El middleware existente no protege /habitaciones: la protección vive aquí (servidor).
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/habitaciones/app/login')
  return (
    <HabProvider session={session}>
      <Shell>{children}</Shell>
    </HabProvider>
  )
}
