import type { Metadata } from 'next'
import '@/components/hab/hab.css'
import { assertDemoAllowed } from '@/lib/hab/env'

export const metadata: Metadata = { title: 'Habitaciones · Vendoya', robots: { index: false, follow: false } }

export default function HabLayout({ children }: { children: React.ReactNode }) {
  assertDemoAllowed() // error claro si NEXT_PUBLIC_HAB_DEMO=1 llega a producción
  return <div className="hab">{children}</div>
}
