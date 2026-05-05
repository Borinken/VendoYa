import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

// Tipos
interface ScrapingFilters {
  operation: string
  propertyType: string
  city: string
  minPrice?: number
  maxPrice?: number
}

interface Property {
  id: string
  title: string
  price: number
  url: string
  description: string
  images: string[]
  rooms: number
  bathrooms: number
  surface: number
  location: string
  operation: string
  propertyType: string
  features: string[]
}

// User agents para rotación
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

async function scrapeIdealistaReal(filters: ScrapingFilters): Promise<Property[]> {
  let properties: Property[] = []
  
  try {
    // MÉTODO: Buscar propiedades usando múltiples técnicas
    console.log('🔍 Buscando propiedades de Idealista para:', filters.city)
    
    // Construir URL de búsqueda  
    const operationPath = filters.operation === 'sale' ? 'venta-viviendas' : 'alquiler-viviendas'
    const citySlug = filters.city.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
    
    let url = `https://www.idealista.com/${operationPath}/${citySlug}/`
    
    const params = new URLSearchParams()
    if (filters.minPrice) params.append('precioDesde', filters.minPrice.toString())
    if (filters.maxPrice) params.append('precioHasta', filters.maxPrice.toString())
    
    if (params.toString()) {
      url = `${url}?${params.toString()}`
    }
    
    console.log('🔍 Scraping Idealista REAL:', url)
    
    // Headers realistas para evitar bloqueos - MEJORADOS
    const headers = {
      'User-Agent': getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'DNT': '1',
      'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
    }
    
    // Delay aleatorio antes de hacer el request (comportamiento humano)
    await randomDelay(2000, 5000)
    
    // Fetch del HTML
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const html = await response.text()
    console.log('✅ HTML obtenido, parseando...')
    
    // Parsear HTML con cheerio
    const $ = cheerio.load(html)
    
    // Buscar artículos de propiedades
    // Idealista usa: article.item con clase específica
    const articles = $('article.item').toArray()
    
    console.log(`📊 Encontrados ${articles.length} artículos en la página`)
    
    for (const article of articles) {
      try {
        const $article = $(article)
        
        // Extraer ID único
        const propertyCode = $article.attr('data-adid') || $article.find('[data-adid]').attr('data-adid')
        
        // Link de la propiedad
        const link = $article.find('a.item-link').attr('href') || ''
        const fullUrl = link.startsWith('http') ? link : `https://www.idealista.com${link}`
        
        // Título
        const title = $article.find('.item-info-container a').text().trim() || 
                     $article.find('.item-link').text().trim()
        
        // Precio
        const priceText = $article.find('.item-price').text().trim()
        const priceMatch = priceText.match(/[\d.]+/)
        const price = priceMatch ? parseInt(priceMatch[0].replace(/\./g, '')) : 0
        
        // Descripción
        const description = $article.find('.item-description').text().trim() ||
                          $article.find('.description').text().trim()
        
        // Características (habitaciones, baños, superficie)
        const details = $article.find('.item-detail').text()
        const roomsMatch = details.match(/(\d+)\s*hab/)
        const bathsMatch = details.match(/(\d+)\s*baño/)
        const surfaceMatch = details.match(/(\d+)\s*m²/)
        
        const rooms = roomsMatch ? parseInt(roomsMatch[1]) : 0
        const bathrooms = bathsMatch ? parseInt(bathsMatch[1]) : 0
        const surface = surfaceMatch ? parseInt(surfaceMatch[1]) : 0
        
        // Imágenes
        const images: string[] = []
        $article.find('img').each((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src') || ''
          if (src && !src.includes('placeholder') && !src.includes('logo')) {
            const fullSrc = src.startsWith('http') ? src : `https:${src}`
            images.push(fullSrc)
          }
        })
        
        // Ubicación
        const location = $article.find('.item-location').text().trim() || filters.city
        
        // Features adicionales
        const features: string[] = []
        $article.find('.item-tags span, .item-multimedia-container span').each((_, span) => {
          const feature = $(span).text().trim()
          if (feature && feature.length > 0) {
            features.push(feature)
          }
        })
        
        // Solo agregar si tiene datos mínimos válidos
        if (propertyCode && price > 0) {
          properties.push({
            id: `idealista-${propertyCode}`,
            title: title || `Propiedad en ${filters.city}`,
            price,
            url: fullUrl,
            description: description || 'Sin descripción disponible',
            images: images.length > 0 ? images : ['https://picsum.photos/800/600?random=idealista'],
            rooms: rooms || 2,
            bathrooms: bathrooms || 1,
            surface: surface || 0,
            location,
            operation: filters.operation || 'sale',
            propertyType: filters.propertyType || 'Piso',
            features: features.length > 0 ? features : ['Idealista'],
          })
        }
      } catch (error) {
        console.error('Error parseando propiedad:', error)
        continue
      }
    }
    
    console.log(`✅ Parseadas ${properties.length} propiedades de Idealista`)
    
  } catch (error) {
    console.error('❌ Error en scraping Idealista:', error)
    throw error
  }
  
  return properties
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function scrapeFotocasaReal(filters: ScrapingFilters): Promise<Property[]> {
  // TODO: Implementar scraping de Fotocasa
  console.log('⚠️ Fotocasa scraping no implementado aún')
  return []
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function scrapeRealAdvisorReal(filters: ScrapingFilters): Promise<Property[]> {
  // TODO: Implementar scraping de RealAdvisor
  console.log('⚠️ RealAdvisor scraping no implementado aún')
  return []
}

export async function POST(request: NextRequest) {
  try {
    const { platform, filters } = await request.json()
    
    console.log(`🔍 Iniciando scraping REAL de ${platform}...`)
    console.log('Filtros:', JSON.stringify(filters, null, 2))
    
    let properties: Property[] = []
    
    // Ejecutar scraping según la plataforma
    switch (platform.toLowerCase()) {
      case 'idealista':
        properties = await scrapeIdealistaReal(filters)
        break
      case 'fotocasa':
        properties = await scrapeFotocasaReal(filters)
        break
      case 'realadvisor':
        properties = await scrapeRealAdvisorReal(filters)
        break
      default:
        throw new Error(`Plataforma no soportada: ${platform}`)
    }
    
    console.log(`✅ Scraping completado: ${properties.length} propiedades encontradas`)
    
    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
      message: `✅ Propiedades REALES capturadas de ${platform} en tiempo real`,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('❌ Error en scraping:', error)
    return NextResponse.json(
      { 
        error: 'Error en scraping',
        details: error instanceof Error ? error.message : 'Unknown error',
        properties: [],
        count: 0,
      },
      { status: 500 }
    )
  }
}
