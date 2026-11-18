import { createClient } from '@supabase/supabase-js'
import type { PortalInfo } from './types'

// Cliente ANON sin sesión: solo llama a las funciones SQL públicas hab_tenant_link_*, que validan el token.
export function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase no está configurado')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function portalInfo(token: string): Promise<PortalInfo | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null // formato del token (32 bytes en hex): evita llamadas inútiles
  const { data, error } = await anonClient().rpc('hab_tenant_link_info', { p_token: token })
  if (error) throw new Error(error.message)
  return (data as PortalInfo | null) ?? null
}

// Límite de frecuencia compartido: contador en base de datos (hab_rate_hit, migración 003). Devuelve true si hay que frenar.
// Si la base no responde, cae a un contador en memoria (no compartido entre instancias) para no dejar la ruta sin límite.
const mem = new Map<string, number[]>()
export async function rateLimited(scope: string, token: string, max = 10, windowSec = 600): Promise<boolean> {
  const key = `${scope}:${token.slice(0, 40)}`.slice(0, 80)
  try {
    const { data, error } = await anonClient().rpc('hab_rate_hit', { p_key: key, p_max: max, p_window_seconds: windowSec })
    if (!error && typeof data === 'boolean') return data
  } catch { /* usa el respaldo */ }
  const now = Date.now(); const arr = (mem.get(key) ?? []).filter(t => now - t < windowSec * 1000); arr.push(now); mem.set(key, arr)
  if (mem.size > 5000) mem.clear()
  return arr.length > max
}

// ---- Solicitudes de candidatos (rutas públicas /habitaciones/a/[token]) ----
import type { ApplicantInfo } from './types'
export async function applicantInfo(token: string): Promise<ApplicantInfo | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null
  const { data, error } = await anonClient().rpc('hab_application_info', { p_token: token })
  if (error) throw new Error(error.message)
  return (data as ApplicantInfo | null) ?? null
}
