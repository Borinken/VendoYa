import { ReferenceForm } from '@/components/hab/ReferenceForm'
export const dynamic = 'force-dynamic'
export default function Page({ params }: { params: { token: string } }) { return <ReferenceForm token={params.token} /> }
