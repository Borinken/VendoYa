import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Obtener todos los filtros activos
    const { data: filters, error: filtersError } = await supabase
      .from('capture_filters')
      .select('*')
      .eq('is_active', true)

    if (filtersError) throw filtersError

    if (!filters || filters.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay filtros activos',
        newProperties: 0,
        properties: []
      })
    }

    const allNewProperties: Array<Record<string, unknown>> = []

    // Ejecutar scraping para cada filtro
    for (const filter of filters) {
      try {
        const scrapeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/scraping/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: filter.source,
            city: filter.city,
            propertyType: filter.property_type,
            operationType: filter.operation_type,
            minPrice: filter.min_price,
            maxPrice: filter.max_price,
            minRooms: filter.min_rooms,
            filterId: filter.id
          })
        })

        if (!scrapeResponse.ok) continue

        const scrapeResult = await scrapeResponse.json()

        if (scrapeResult.success && scrapeResult.properties) {
          // Filtrar solo propiedades nuevas (que no existan en la BD)
          for (const prop of scrapeResult.properties) {
            const { data: existing } = await supabase
              .from('captured_properties')
              .select('id')
              .eq('source', filter.source)
              .eq('source_id', prop.id)
              .single()

            if (!existing) {
              // Es una propiedad nueva
              const { data: newProp, error: insertError } = await supabase
                .from('captured_properties')
                .insert([{
                  filter_id: filter.id,
                  source: filter.source,
                  source_id: prop.id,
                  source_url: prop.url || `https://${filter.source}.com/...`,
                  data: {
                    title: prop.title,
                    price: prop.price,
                    city: prop.city || filter.city,
                    surface: prop.surface,
                    rooms: prop.rooms,
                    bathrooms: prop.bathrooms,
                    description: prop.description,
                    images: prop.images || [],
                    address: prop.address,
                    propertyType: prop.propertyType || filter.property_type
                  },
                  status: 'new',
                  match_score: 100,
                  first_seen_at: new Date().toISOString(),
                  last_checked_at: new Date().toISOString()
                }])
                .select()
                .single()

              if (!insertError && newProp) {
                allNewProperties.push(newProp)
              }
            }
          }
        }

        // Actualizar last_run del filtro
        await supabase
          .from('capture_filters')
          .update({
            last_run: new Date().toISOString(),
            properties_found: scrapeResult.properties?.length || 0
          })
          .eq('id', filter.id)

      } catch (error) {
        console.error(`Error processing filter ${filter.id}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completa. ${allNewProperties.length} nuevas propiedades encontradas`,
      newProperties: allNewProperties.length,
      properties: allNewProperties,
      filtersProcessed: filters.length
    })

  } catch (error) {
    console.error('Error in sync-all:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
