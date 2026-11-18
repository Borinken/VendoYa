import type { Metadata } from 'next'
import '@/components/hab/hab.css'

export const metadata: Metadata = { title: 'Mi habitación', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function T({ children }: { children: React.ReactNode }) { return <div className="hab">{children}</div> }
