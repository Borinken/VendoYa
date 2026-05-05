// Sistema anti-detección avanzado para scraping seguro
import { createHash, randomBytes } from 'crypto'

// Pool de User Agents reales actualizados
const USER_AGENTS = [
  // Chrome en Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  
  // Chrome en macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Firefox en Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  
  // Firefox en macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
  
  // Safari en macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
]

// Headers HTTP realistas
function getRealisticHeaders(userAgent: string, referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'DNT': '1',
  }

  if (referer) {
    headers['Referer'] = referer
  }

  // Agregar Sec-CH headers para Chrome
  if (userAgent.includes('Chrome')) {
    headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"'
    headers['sec-ch-ua-mobile'] = '?0'
    headers['sec-ch-ua-platform'] = '"Windows"'
  }

  return headers
}

// Delays aleatorios humanizados
export function getHumanDelay(min: number = 2000, max: number = 5000): number {
  // Distribución normal para simular comportamiento humano
  const mean = (min + max) / 2
  const stdDev = (max - min) / 6
  
  let u = 0, v = 0
  while(u === 0) u = Math.random()
  while(v === 0) v = Math.random()
  
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  const delay = mean + stdDev * num
  
  return Math.max(min, Math.min(max, Math.round(delay)))
}

// Gestión de sesiones por plataforma
interface Session {
  cookies: Map<string, string>
  userAgent: string
  lastRequest: number
  requestCount: number
  createdAt: number
  fingerprint: string
}

class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private readonly SESSION_MAX_AGE = 30 * 60 * 1000 // 30 minutos
  private readonly MAX_REQUESTS_PER_SESSION = 50

  createSession(platform: string): Session {
    const userAgent = this.getRandomUserAgent()
    const fingerprint = this.generateFingerprint()
    
    const session: Session = {
      cookies: new Map(),
      userAgent,
      lastRequest: Date.now(),
      requestCount: 0,
      createdAt: Date.now(),
      fingerprint
    }
    
    this.sessions.set(platform, session)
    return session
  }

  getSession(platform: string): Session | null {
    const session = this.sessions.get(platform)
    
    if (!session) return null
    
    // Renovar sesión si es muy antigua o tiene muchos requests
    const age = Date.now() - session.createdAt
    if (age > this.SESSION_MAX_AGE || session.requestCount > this.MAX_REQUESTS_PER_SESSION) {
      this.sessions.delete(platform)
      return null
    }
    
    return session
  }

  getOrCreateSession(platform: string): Session {
    const existing = this.getSession(platform)
    if (existing) return existing
    
    return this.createSession(platform)
  }

  updateSession(platform: string, cookies?: Record<string, string>) {
    const session = this.sessions.get(platform)
    if (!session) return
    
    session.lastRequest = Date.now()
    session.requestCount++
    
    if (cookies) {
      Object.entries(cookies).forEach(([key, value]) => {
        session.cookies.set(key, value)
      })
    }
  }

  clearSession(platform: string) {
    this.sessions.delete(platform)
  }

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
  }

  private generateFingerprint(): string {
    const components = [
      Math.random().toString(36).substring(7),
      Date.now().toString(),
      randomBytes(16).toString('hex')
    ].join('-')
    
    return createHash('sha256').update(components).digest('hex')
  }
}

export const sessionManager = new SessionManager()

// Rate Limiting inteligente
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly MAX_REQUESTS_PER_MINUTE = 15  // Aumentado para scraping minuto a minuto
  private readonly MAX_REQUESTS_PER_HOUR = 200   // Aumentado para sincronización frecuente
  private readonly MAX_REQUESTS_PER_DAY = 1000   // Aumentado para scraping 24/7
  private readonly BACKOFF_MULTIPLIER = 2
  private failures: Map<string, number> = new Map()

  async waitIfNeeded(platform: string): Promise<void> {
    const now = Date.now()
    const requests = this.requests.get(platform) || []
    
    // Limpiar requests antiguos (más de 24 horas)
    const recentRequests = requests.filter(time => now - time < 24 * 60 * 60 * 1000)
    this.requests.set(platform, recentRequests)
    
    // Verificar límites
    const lastMinute = recentRequests.filter(time => now - time < 60 * 1000)
    const lastHour = recentRequests.filter(time => now - time < 60 * 60 * 1000)
    
    let delay = 0
    
    // Límite por minuto
    if (lastMinute.length >= this.MAX_REQUESTS_PER_MINUTE) {
      delay = Math.max(delay, 60000 - (now - lastMinute[0]))
    }
    
    // Límite por hora
    if (lastHour.length >= this.MAX_REQUESTS_PER_HOUR) {
      delay = Math.max(delay, 3600000 - (now - lastHour[0]))
    }
    
    // Límite por día
    if (recentRequests.length >= this.MAX_REQUESTS_PER_DAY) {
      delay = Math.max(delay, 86400000 - (now - recentRequests[0]))
    }
    
    // Backoff exponencial en caso de errores
    const failures = this.failures.get(platform) || 0
    if (failures > 0) {
      const backoffDelay = Math.min(
        Math.pow(this.BACKOFF_MULTIPLIER, failures) * 1000,
        300000 // máximo 5 minutos
      )
      delay = Math.max(delay, backoffDelay)
    }
    
    if (delay > 0) {
      console.log(`⏳ Rate limit alcanzado para ${platform}. Esperando ${Math.round(delay/1000)}s`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    // Agregar delay aleatorio adicional (humanización)
    const humanDelay = getHumanDelay()
    await new Promise(resolve => setTimeout(resolve, humanDelay))
    
    // Registrar request
    recentRequests.push(now)
    this.requests.set(platform, recentRequests)
  }

  recordFailure(platform: string) {
    const current = this.failures.get(platform) || 0
    this.failures.set(platform, current + 1)
  }

  recordSuccess(platform: string) {
    this.failures.delete(platform)
  }

  getStats(platform: string): {
    lastMinute: number
    lastHour: number
    lastDay: number
    failures: number
  } {
    const now = Date.now()
    const requests = this.requests.get(platform) || []
    
    return {
      lastMinute: requests.filter(time => now - time < 60 * 1000).length,
      lastHour: requests.filter(time => now - time < 60 * 60 * 1000).length,
      lastDay: requests.filter(time => now - time < 24 * 60 * 60 * 1000).length,
      failures: this.failures.get(platform) || 0
    }
  }
}

export const rateLimiter = new RateLimiter()

// Configuración de scraping seguro por plataforma
export const PLATFORM_CONFIG = {
  idealista: {
    baseUrl: 'https://www.idealista.com',
    loginUrl: 'https://www.idealista.com/login',
    maxConcurrent: 1,
    delayBetweenPages: [3000, 6000],
    sessionTimeout: 30 * 60 * 1000,
    detectPatterns: ['robot', 'captcha', 'verificación'],
  },
  fotocasa: {
    baseUrl: 'https://www.fotocasa.es',
    loginUrl: 'https://www.fotocasa.es/es/login',
    maxConcurrent: 1,
    delayBetweenPages: [2500, 5500],
    sessionTimeout: 30 * 60 * 1000,
    detectPatterns: ['robot', 'captcha', 'verificar'],
  },
  realadvisor: {
    baseUrl: 'https://www.realadvisor.es',
    loginUrl: 'https://www.realadvisor.es/login',
    maxConcurrent: 1,
    delayBetweenPages: [2000, 5000],
    sessionTimeout: 30 * 60 * 1000,
    detectPatterns: ['bot', 'captcha', 'suspicious'],
  },
}

// Obtener headers seguros para una plataforma
export function getSecureHeaders(platform: keyof typeof PLATFORM_CONFIG, referer?: string): Record<string, string> {
  const session = sessionManager.getOrCreateSession(platform)
  const config = PLATFORM_CONFIG[platform]
  
  const headers = getRealisticHeaders(session.userAgent, referer || config.baseUrl)
  
  // Agregar cookies de sesión
  if (session.cookies.size > 0) {
    headers['Cookie'] = Array.from(session.cookies.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
  }
  
  return headers
}

// Detectar si fuimos bloqueados
export function isBlocked(html: string, platform: keyof typeof PLATFORM_CONFIG): boolean {
  const config = PLATFORM_CONFIG[platform]
  const lowerHtml = html.toLowerCase()
  
  return config.detectPatterns.some(pattern => lowerHtml.includes(pattern))
}

// Wrapper seguro para hacer requests
export async function secureRequest(
  platform: keyof typeof PLATFORM_CONFIG,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Rate limiting
  await rateLimiter.waitIfNeeded(platform)
  
  // Extraer referer si existe
  let referer: string | undefined
  if (options.headers) {
    if (options.headers instanceof Headers) {
      referer = options.headers.get('Referer') || undefined
    } else if (Array.isArray(options.headers)) {
      const refererEntry = options.headers.find(([key]) => key === 'Referer')
      referer = refererEntry ? refererEntry[1] : undefined
    } else {
      referer = (options.headers as Record<string, string>)['Referer']
    }
  }
  
  // Obtener headers seguros
  const headers = getSecureHeaders(platform, referer)
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })
    
    // Verificar si fuimos bloqueados
    const html = await response.text()
    if (isBlocked(html, platform)) {
      rateLimiter.recordFailure(platform)
      sessionManager.clearSession(platform)
      throw new Error(`Bloqueado por ${platform}. Sesión reiniciada.`)
    }
    
    // Actualizar sesión con cookies
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      const cookies: Record<string, string> = {}
      setCookie.split(',').forEach(cookie => {
        const [nameValue] = cookie.split(';')
        const [name, value] = nameValue.split('=')
        if (name && value) {
          cookies[name.trim()] = value.trim()
        }
      })
      sessionManager.updateSession(platform, cookies)
    } else {
      sessionManager.updateSession(platform)
    }
    
    rateLimiter.recordSuccess(platform)
    
    // Devolver response con el texto ya leído
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
    
  } catch (error) {
    rateLimiter.recordFailure(platform)
    throw error
  }
}

// Obtener estadísticas de seguridad
export function getSecurityStats() {
  return {
    idealista: rateLimiter.getStats('idealista'),
    fotocasa: rateLimiter.getStats('fotocasa'),
    realadvisor: rateLimiter.getStats('realadvisor'),
  }
}
