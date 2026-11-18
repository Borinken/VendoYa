import type { SupabaseClient } from '@supabase/supabase-js'

// Tras iniciar sesión: acepta la invitación (si viene ?invite=) y crea la org elegida en el registro (hab_bootstrap_account).
export async function ensureAccount(sb: SupabaseClient, inviteToken?: string | null): Promise<void> {
  if (inviteToken) {
    const { error } = await sb.rpc('hab_accept_invite', { p_token: inviteToken })
    if (error) throw new Error(error.message)
    return
  }
  const { data: { user } } = await sb.auth.getUser()
  const kind = user?.user_metadata?.hab_kind as string | undefined
  const name = user?.user_metadata?.hab_org_name as string | undefined
  if (kind && name) {
    const { error } = await sb.rpc('hab_bootstrap_account', { p_kind: kind, p_name: name })
    if (error) throw new Error(error.message)
  }
}
