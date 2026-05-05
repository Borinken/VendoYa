import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/encryption'
import { secureRequest, sessionManager, PLATFORM_CONFIG, getSecurityStats } from '@/lib/anti-detection'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ScrapingRequest {
  platform: 'idealista' | 'fotocasa' | 'realadvisor'
  filters: {
    city?: string
    minPrice?: number
    maxPrice?: number
    minRooms?: number
    propertyType?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { platform, filters }: ScrapingRequest = await request.json()

    // Validar plataforma
    if (!['idealista', 'fotocasa', 'realadvisor'].includes(platform)) {
      return NextResponse.json(
        { error: 'Plataforma no válida' },
        { status: 400 }
      )
    }

    // Obtener credenciales encriptadas
    const { data: credsData, error: credsError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', [
        `${platform}_username`,
        `${platform}_password`
      ])

    if (credsError || !credsData || credsData.length < 2) {
      return NextResponse.json(
        { error: 'Credenciales no configuradas para esta plataforma' },
        { status: 400 }
      )
    }

    // Desencriptar credenciales
    const username = decrypt(
      credsData.find(c => c.config_key === `${platform}_username`)?.config_value || ''
    )
    const password = decrypt(
      credsData.find(c => c.config_key === `${platform}_password`)?.config_value || ''
    )

    // Verificar sesión o login
    let session = sessionManager.getSession(platform)
    if (!session) {
      // Realizar login seguro
      const loginSuccess = await performSecureLogin(platform, username, password)
      if (!loginSuccess) {
        return NextResponse.json(
          { error: 'Error al iniciar sesión. Verifica tus credenciales.' },
          { status: 401 }
        )
      }
      session = sessionManager.getSession(platform)
    }

    // Realizar scraping con protección anti-detección
    const properties = await scrapeProperties(platform, filters)

    // Obtener estadísticas de seguridad
    const stats = getSecurityStats()

    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
      security: {
        platform,
        requests_last_minute: stats[platform].lastMinute,
        requests_last_hour: stats[platform].lastHour,
        requests_last_day: stats[platform].lastDay,
        failures: stats[platform].failures,
        session_active: !!session
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error en scraping seguro:', errorMessage)
    
    // Si fuimos bloqueados, limpiar sesión
    if (errorMessage.includes('Bloqueado')) {
      return NextResponse.json(
        { 
          error: 'Detección de scraping. Sesión reiniciada. Intenta de nuevo en 5 minutos.',
          retry_after: 300 
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Error en scraping: ' + errorMessage },
      { status: 500 }
    )
  }
}

async function performSecureLogin(
  platform: 'idealista' | 'fotocasa' | 'realadvisor',
  username: string,
  password: string
): Promise<boolean> {
  try {
    const config = PLATFORM_CONFIG[platform]
    
    // Paso 1: Obtener página de login
    const loginPageResponse = await secureRequest(platform, config.loginUrl)
    const loginHtml = await loginPageResponse.text()
    
    // Verificar si ya hay sesión activa
    if (loginHtml.includes('logout') || loginHtml.includes('cerrar sesión')) {
      console.log(`✅ Sesión ya activa para ${platform}`)
      return true
    }

    // Paso 2: Extraer CSRF token si existe
    let csrfToken = ''
    const csrfMatch = loginHtml.match(/name="csrf_token".*?value="([^"]+)"/)
    if (csrfMatch) {
      csrfToken = csrfMatch[1]
    }

    // Paso 3: Preparar datos de login según plataforma
    const loginData = new URLSearchParams()
    
    switch (platform) {
      case 'idealista':
        loginData.append('username', username)
        loginData.append('password', password)
        if (csrfToken) loginData.append('csrf_token', csrfToken)
        break
      
      case 'fotocasa':
        loginData.append('email', username)
        loginData.append('password', password)
        if (csrfToken) loginData.append('_csrf', csrfToken)
        break
      
      case 'realadvisor':
        loginData.append('email', username)
        loginData.append('password', password)
        break
    }

    // Paso 4: Realizar login
    const loginResponse = await secureRequest(platform, config.loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': config.loginUrl,
        'Origin': config.baseUrl,
      },
      body: loginData.toString()
    })

    const loginResultHtml = await loginResponse.text()

    // Verificar si el login fue exitoso
    if (
      loginResponse.status === 200 &&
      !loginResultHtml.includes('error') &&
      !loginResultHtml.includes('incorrecto') &&
      !loginResultHtml.includes('invalid')
    ) {
      console.log(`✅ Login exitoso en ${platform}`)
      return true
    }

    console.error(`❌ Login fallido en ${platform}`)
    return false

  } catch (error) {
    console.error(`Error en login de ${platform}:`, error)
    return false
  }
}

async function scrapeProperties(
  platform: 'idealista' | 'fotocasa' | 'realadvisor',
  filters: ScrapingRequest['filters']
): Promise<Record<string, unknown>[]> {
  try {
    // Construir URL de búsqueda según plataforma y filtros
    const searchUrl = buildSearchUrl(platform, filters)
    
    // Realizar request seguro
    const response = await secureRequest(platform, searchUrl)
    const html = await response.text()
    
    // Parsear propiedades según plataforma
    const properties = parseProperties(platform, html)
    
    return properties

  } catch (error) {
    console.error(`Error scraping ${platform}:`, error)
    throw error
  }
}

function buildSearchUrl(
  platform: 'idealista' | 'fotocasa' | 'realadvisor',
  filters: ScrapingRequest['filters']
): string {
  let url = PLATFORM_CONFIG[platform].baseUrl
  
  switch (platform) {
    case 'idealista':
      url += '/venta-viviendas'
      if (filters.city) url += `/${filters.city.toLowerCase()}`
      const idealistaParams = new URLSearchParams()
      if (filters.minPrice) idealistaParams.append('precioMinimo', filters.minPrice.toString())
      if (filters.maxPrice) idealistaParams.append('precioMaximo', filters.maxPrice.toString())
      if (filters.minRooms) idealistaParams.append('habitaciones', filters.minRooms.toString())
      if (idealistaParams.toString()) url += '?' + idealistaParams.toString()
      break
    
    case 'fotocasa':
      url += '/es/comprar/viviendas'
      if (filters.city) url += `/${filters.city.toLowerCase()}`
      const fotocasaParams = new URLSearchParams()
      if (filters.minPrice) fotocasaParams.append('minPrice', filters.minPrice.toString())
      if (filters.maxPrice) fotocasaParams.append('maxPrice', filters.maxPrice.toString())
      if (filters.minRooms) fotocasaParams.append('minRooms', filters.minRooms.toString())
      if (fotocasaParams.toString()) url += '?' + fotocasaParams.toString()
      break
    
    case 'realadvisor':
      url += '/inmuebles'
      const realadvisorParams = new URLSearchParams()
      if (filters.city) realadvisorParams.append('location', filters.city)
      if (filters.minPrice) realadvisorParams.append('price_min', filters.minPrice.toString())
      if (filters.maxPrice) realadvisorParams.append('price_max', filters.maxPrice.toString())
      if (realadvisorParams.toString()) url += '?' + realadvisorParams.toString()
      break
  }
  
  return url
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function parseProperties(platform: string, _html: string): Record<string, unknown>[] {
  // Implementación básica - aquí iría el parser específico de cada plataforma
  // Por ahora retornamos array vacío como placeholder
  // TODO: Usar _html para parsear HTML cuando se implemente
  const properties: Record<string, unknown>[] = []
  
  // TODO: Implementar parsers específicos usando cheerio o similar
  // Cada plataforma tiene su propia estructura HTML
  
  console.log(`⚠️ Parser de ${platform} pendiente de implementación`)
  
  return properties
}

// Endpoint para verificar estado de seguridad
export async function GET() {
  try {
    const stats = getSecurityStats()
    
    return NextResponse.json({
      security_status: stats,
      platforms: Object.keys(PLATFORM_CONFIG),
      message: 'Sistema anti-detección activo'
    })
  } catch {
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}
