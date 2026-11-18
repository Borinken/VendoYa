import { TenantPortal } from '@/components/hab/TenantPortal'
export const dynamic = 'force-dynamic'
export default function Page({ params }: { params: { token: string } }) { return <TenantPortal token={params.token} /> }
