import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt } from '@/lib/encryption'

// Cliente creado al usar el endpoint (no al importar el módulo) para que `next build` no falle sin variables de entorno.
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


// Solo un administrador de plataforma con sesión válida puede leer o escribir credenciales.
async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const supabase = getSupabase()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: adm } = await supabase.from('hab_platform_admins').select('user_id').eq('user_id', data.user.id).maybeSingle()
  if (!adm) return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
  return null
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin(request); if (denied) return denied
    const supabase = getSupabase()
    const credentials = await request.json()

    // Encriptar cada credencial antes de guardarla
    const encryptedCreds = Object.entries(credentials)
      .filter(([, value]) => value) // Solo guardar las que tienen valor
      .map(([key, value]) => ({
        config_key: key,
        config_value: encrypt(value as string),
        description: `Credencial encriptada para ${key}`,
        updated_at: new Date().toISOString()
      }))

    // Upsert todas las credenciales
    const { error } = await supabase
      .from('system_config')
      .upsert(encryptedCreds, { onConflict: 'config_key' })

    if (error) {
      console.error('Error saving credentials:', error)
      return NextResponse.json(
        { error: 'Error al guardar credenciales' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Credenciales guardadas y encriptadas correctamente'
    })

  } catch (error) {
    console.error('Error in credentials API:', error)
    return NextResponse.json(
      { error: 'Error al procesar credenciales' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const denied = await requireAdmin(request); if (denied) return denied
    const supabase = getSupabase()
    // Obtener credenciales (devueltas encriptadas, no las desencriptamos aquí)
    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', [
        'idealista_username',
        'idealista_password',
        'fotocasa_username',
        'fotocasa_password',
        'realadvisor_username',
        'realadvisor_password'
      ])

    if (error) throw error

    // Devolver las credenciales (aún encriptadas)
    // El frontend solo mostrará placeholders
    const credentials: Record<string, string> = {}
    data?.forEach(item => {
      // Devolver solo indicador de que existe, no el valor real
      credentials[item.config_key] = item.config_value ? '••••••••' : ''
    })

    return NextResponse.json({ credentials })

  } catch (error) {
    console.error('Error loading credentials:', error)
    return NextResponse.json(
      { error: 'Error al cargar credenciales' },
      { status: 500 }
    )
  }
}
