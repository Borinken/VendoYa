import { SignForm } from '@/components/hab/SignForm'
export const dynamic = 'force-dynamic'
export default function Page({ params }: { params: { token: string } }) { return <SignForm token={params.token} /> }
