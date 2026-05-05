import { NextRequest, NextResponse } from 'next/server'

// Endpoint simple que devuelve propiedades de PRUEBA
// En producción real, aquí iría el scraping con un servicio externo

export async function POST(request: NextRequest) {
  try {
    const { platform, filters } = await request.json()
    
    console.log(`🔍 Generando propiedades de prueba para ${platform}...`)
    console.log('Filtros:', filters)
    
    // Generar propiedades de prueba realistas
    const properties = []
    const numProperties = Math.floor(Math.random() * 8) + 3 // Entre 3 y 10 propiedades
    
    for (let i = 0; i < numProperties; i++) {
      const basePrice = filters.minPrice || 100000
      const maxPrice = filters.maxPrice || 300000
      const price = Math.floor(Math.random() * (maxPrice - basePrice)) + basePrice
      
      properties.push({
        id: `${platform}-${Date.now()}-${i}`,
        title: `${filters.propertyType || 'Piso'} en ${filters.city} - ${Math.floor(Math.random() * 100) + 50}m²`,
        price: price,
        url: `https://www.${platform}.com/inmueble/${Date.now()}-${i}`,
        description: `Precioso ${filters.propertyType?.toLowerCase() || 'piso'} en ${filters.city}. ${Math.floor(Math.random() * 3) + 2} habitaciones, ${Math.floor(Math.random() * 2) + 1} baños. Zona tranquila y bien comunicada.`,
        images: [
          `https://picsum.photos/800/600?random=${i}`,
          `https://picsum.photos/800/600?random=${i + 100}`,
          `https://picsum.photos/800/600?random=${i + 200}`,
        ],
        rooms: Math.floor(Math.random() * 3) + 2,
        bathrooms: Math.floor(Math.random() * 2) + 1,
        surface: Math.floor(Math.random() * 80) + 50,
        location: filters.city,
        operation: filters.operation || 'sale',
        propertyType: filters.propertyType || 'Piso',
        features: [
          'Ascensor',
          'Parking',
          'Terraza',
          'Aire acondicionado',
          'Calefacción'
        ].slice(0, Math.floor(Math.random() * 4) + 2)
      })
    }
    
    // Delay simulado (parecer real)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    console.log(`✅ Generadas ${properties.length} propiedades de prueba`)
    
    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
      message: '⚠️ ATENCIÓN: Estas son propiedades de PRUEBA generadas aleatoriamente. Para scraping real necesitas configurar un servicio externo (Browserless, ScrapingBee, etc.)'
    })
    
  } catch (error) {
    console.error('Error generando propiedades:', error)
    return NextResponse.json(
      { 
        error: 'Error generando propiedades',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
