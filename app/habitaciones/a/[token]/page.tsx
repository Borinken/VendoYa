import { ApplicantForm } from '@/components/hab/ApplicantForm'
export const dynamic = 'force-dynamic'
export default function Page({ params }: { params: { token: string } }) { return <ApplicantForm token={params.token} /> }
