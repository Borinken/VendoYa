import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import puppeteer, { Browser, Page } from 'puppeteer'

// User agents para rotación (comportamiento natural)
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
]

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  
  // User agent aleatorio
  await page.setUserAgent(getRandomUserAgent())
  
  // Viewport aleatorio (simula diferentes dispositivos)
  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ]
  const viewport = viewports[Math.floor(Math.random() * viewports.length)]
  await page.setViewport(viewport)
  
  // Headers adicionales para parecer más humano
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  })
  
  // Ocultar que es un bot (anti-detección)
  await page.evaluateOnNewDocument(() => {
    // Eliminar webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    })
    
    // Simular plugins de navegador real
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    })
    
    // Chrome runtime
    // @ts-expect-error - Chrome is not defined in types
    window.chrome = {
      runtime: {},
    }
    
    // Permissions
    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission } as PermissionStatus) :
        originalQuery(parameters)
    )
  })
  
  return page
}

async function scrapeIdealista(page: Page, filters: {
  operation: string
  propertyType: string
  city: string
  minPrice?: number
  maxPrice?: number
}): Promise<unknown[]> {
  const properties: unknown[] = []
  
  try {
    // Construir URL de búsqueda
    const operationPath = filters.operation === 'sale' ? 'venta-viviendas' : 'alquiler-viviendas'
    const citySlug = filters.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
    
    const url = `https://www.idealista.com/${operationPath}/${citySlug}/`
    
    const params = new URLSearchParams()
    if (filters.minPrice) params.append('precioDesde', filters.minPrice.toString())
    if (filters.maxPrice) params.append('precioHasta', filters.maxPrice.toString())
    
    if (params.toString()) {
      const urlWithParams = `${url}?${params.toString()}`
      console.log('🔍 Scraping Idealista:', urlWithParams)
      await page.goto(urlWithParams, { waitUntil: 'networkidle2', timeout: 30000 })
    } else {
      console.log('🔍 Scraping Idealista:', url)
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    }
    
    // Esperar a que carguen las propiedades
    await page.waitForSelector('.item-info-container, article.item', { timeout: 10000 }).catch(() => null)
    
    // Extraer datos
    const items = await page.evaluate(() => {
      const results: unknown[] = []
      const listings = document.querySelectorAll('.item-info-container, article.item')
      
      listings.forEach((listing) => {
        try {
          const titleEl = listing.querySelector('.item-link, a.item-link')
          const priceEl = listing.querySelector('.item-price, .price-row .item-price')
          const detailsEl = listing.querySelector('.item-detail, .item-detail-char')
          
          if (titleEl && priceEl) {
            results.push({
              title: titleEl.textContent?.trim() || '',
              price: priceEl.textContent?.trim() || '',
              url: (titleEl as HTMLAnchorElement).href || '',
              details: detailsEl?.textContent?.trim() || '',
              source: 'idealista'
            })
          }
        } catch {
          // Ignorar errores en items individuales
        }
      })
      
      return results
    })
    
    properties.push(...items)
    console.log(`✓ Encontradas ${items.length} propiedades en Idealista`)
    
  } catch (error) {
    console.error('Error scraping Idealista:', error)
  }
  
  return properties
}

async function scrapeFotocasa(page: Page, filters: {
  operation: string
  propertyType: string
  city: string
  minPrice?: number
  maxPrice?: number
}): Promise<unknown[]> {
  const properties: unknown[] = []
  
  try {
    const operationPath = filters.operation === 'sale' ? 'comprar' : 'alquilar'
    const citySlug = filters.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
    
    const url = `https://www.fotocasa.es/es/${operationPath}/viviendas/${citySlug}/todas-las-zonas/l`
    
    console.log('🔍 Scraping Fotocasa:', url)
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    await page.waitForSelector('.re-Card, article', { timeout: 10000 }).catch(() => null)
    
    const items = await page.evaluate(() => {
      const results: unknown[] = []
      const listings = document.querySelectorAll('.re-Card, article')
      
      listings.forEach((listing) => {
        try {
          const titleEl = listing.querySelector('.re-Card-title, h3')
          const priceEl = listing.querySelector('.re-Card-price, .fc-Price')
          const linkEl = listing.querySelector('a')
          
          if (titleEl && priceEl) {
            results.push({
              title: titleEl.textContent?.trim() || '',
              price: priceEl.textContent?.trim() || '',
              url: linkEl?.href || '',
              source: 'fotocasa'
            })
          }
        } catch {
          // Ignorar errores
        }
      })
      
      return results
    })
    
    properties.push(...items)
    console.log(`✓ Encontradas ${items.length} propiedades en Fotocasa`)
    
  } catch (error) {
    console.error('Error scraping Fotocasa:', error)
  }
  
  return properties
}

async function scrapeRealAdvisor(page: Page, filters: {
  operation: string
  propertyType: string
  city: string
  minPrice?: number
  maxPrice?: number
}): Promise<unknown[]> {
  const properties: unknown[] = []
  
  try {
    const operationType = filters.operation === 'sale' ? 'sale' : 'rent'
    const citySlug = filters.city.toLowerCase().replace(/\s+/g, '-')
    
    const url = `https://www.realadvisor.es/en/property-${operationType}/${citySlug}`
    
    console.log('🔍 Scraping RealAdvisor:', url)
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    await page.waitForSelector('.property-card, .listing-item', { timeout: 10000 }).catch(() => null)
    
    const items = await page.evaluate(() => {
      const results: unknown[] = []
      const listings = document.querySelectorAll('.property-card, .listing-item')
      
      listings.forEach((listing) => {
        try {
          const titleEl = listing.querySelector('h3, .title')
          const priceEl = listing.querySelector('.price, .property-price')
          const linkEl = listing.querySelector('a')
          
          if (titleEl && priceEl) {
            results.push({
              title: titleEl.textContent?.trim() || '',
              price: priceEl.textContent?.trim() || '',
              url: linkEl?.href || '',
              source: 'realadvisor'
            })
          }
        } catch {
          // Ignorar errores
        }
      })
      
      return results
    })
    
    properties.push(...items)
    console.log(`✓ Encontradas ${items.length} propiedades en RealAdvisor`)
    
  } catch (error) {
    console.error('Error scraping RealAdvisor:', error)
  }
  
  return properties
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null
  
  try {
    const { filter } = await request.json()
    
    if (!filter) {
      return NextResponse.json(
        { error: 'Filter es requerido' },
        { status: 400 }
      )
    }

    // Obtener configuración de scraping
    const { data: configData } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['scraping_delay_min', 'scraping_delay_max'])

    const config: Record<string, string> = {}
    configData?.forEach(item => {
      config[item.config_key] = item.config_value
    })

    const delayMin = parseInt(config['scraping_delay_min'] || '2000')
    const delayMax = parseInt(config['scraping_delay_max'] || '5000')

    // Iniciar navegador en modo headless (invisible)
    console.log('🚀 Iniciando navegador headless...')
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    })

    const allProperties: unknown[] = []
    const sources = filter.source === 'all' ? ['idealista', 'fotocasa', 'realadvisor'] : [filter.source]

    for (const source of sources) {
      const page = await setupPage(browser)
      
      try {
        let properties: unknown[] = []
        
        if (source === 'idealista') {
          properties = await scrapeIdealista(page, {
            operation: filter.operation_type,
            propertyType: filter.property_type,
            city: filter.city,
            minPrice: filter.min_price,
            maxPrice: filter.max_price,
          })
        } else if (source === 'fotocasa') {
          properties = await scrapeFotocasa(page, {
            operation: filter.operation_type,
            propertyType: filter.property_type,
            city: filter.city,
            minPrice: filter.min_price,
            maxPrice: filter.max_price,
          })
        } else if (source === 'realadvisor') {
          properties = await scrapeRealAdvisor(page, {
            operation: filter.operation_type,
            propertyType: filter.property_type,
            city: filter.city,
            minPrice: filter.min_price,
            maxPrice: filter.max_price,
          })
        }
        
        allProperties.push(...properties)
        
        // Delay aleatorio entre sources (comportamiento humano)
        if (sources.length > 1) {
          await randomDelay(delayMin, delayMax)
        }
        
      } finally {
        await page.close()
      }
    }

    await browser.close()
    browser = null

    // Guardar propiedades en base de datos
    if (allProperties.length > 0 && filter.id) {
      const propertiesToSave = allProperties.map(prop => ({
        filter_id: filter.id,
        source: (prop as { source: string }).source,
        source_id: `${(prop as { source: string }).source}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source_url: (prop as { url: string }).url,
        data: prop,
        status: 'new',
      }))

      await supabase
        .from('captured_properties')
        .insert(propertiesToSave)
    }

    return NextResponse.json({
      success: true,
      count: allProperties.length,
      properties: allProperties,
    })

  } catch (error) {
    console.error('Error en scraping:', error)
    
    if (browser) {
      await browser.close().catch(() => null)
    }
    
    return NextResponse.json(
      { error: 'Error en el scraping', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
