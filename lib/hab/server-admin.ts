import { createClient } from '@supabase/supabase-js'

// ÚNICO uso de service_role del módulo: solo en el servidor y solo desde la ruta de subida de fotos del
// enlace de inquilino (/habitaciones/t/[token]/upload), DESPUÉS de validar el token con hab_tenant_link_info.
// Nunca se importa desde componentes de cliente.
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Subida de fotos no configurada (falta SUPABASE_SERVICE_ROLE_KEY en el servidor)')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
