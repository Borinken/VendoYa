import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface PropertyData {
  city?: string
  price?: number
  surface?: number
  rooms?: number
  propertyType?: string
  [key: string]: unknown
}

interface Property {
  id: string
  source: string
  source_id: string
  source_url: string
  data: PropertyData
  status: string
  filter_id?: string
}

interface AlarmConditions {
  maxPrice?: number
  minRooms?: number
  minSurface?: number
  cities?: string[]
  propertyTypes?: string[]
}

interface Alarm {
  whatsapp_number: string
  conditions: AlarmConditions
  is_active: boolean
}

// Este endpoint será llamado por Vercel Cron cada minuto
export async function GET(request: NextRequest) {
  try {
    // Verificar que la petición viene de Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🤖 Iniciando sincronización automática (cron minuto a minuto)...')
    
    // Obtener la URL base del request para hacer llamadas internas
    const baseUrl = request.url.split('/api/')[0]

    // Verificar si auto-sync está habilitado
    const { data: config } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'auto_sync_properties')
      .single()

    if (!config || config.config_value !== 'true') {
      return NextResponse.json({
        message: 'Auto-sync deshabilitado',
        skipped: true
      })
    }

    // Obtener todos los filtros activos
    const { data: filters, error: filtersError } = await supabase
      .from('capture_filters')
      .select('*')
      .eq('is_active', true)

    if (filtersError) {
      console.error('Error obteniendo filtros:', filtersError)
      throw filtersError
    }

    if (!filters || filters.length === 0) {
      return NextResponse.json({
        message: 'No hay filtros activos',
        newProperties: 0
      })
    }

    console.log(`📊 Ejecutando ${filters.length} filtros...`)

    let totalNewProperties = 0
    const results = []

    // Ejecutar cada filtro
    for (const filter of filters) {
      try {
        const response = await fetch(
          `${baseUrl}/api/scraping/scrape-mock`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: filter.source,
              filters: filter.filters
            })
          }
        )

        const result = await response.json()
        
        if (result.properties && result.properties.length > 0) {
          // Guardar propiedades nuevas
          for (const property of result.properties) {
            // Verificar si ya existe
            const { data: existing } = await supabase
              .from('captured_properties')
              .select('id')
              .eq('source', filter.source)
              .eq('source_id', property.id)
              .single()

            if (!existing) {
              await supabase
                .from('captured_properties')
                .insert({
                  source: filter.source,
                  source_id: property.id,
                  source_url: property.url,
                  data: property,
                  status: 'new',
                  filter_id: filter.id
                })

              totalNewProperties++
            }
          }
        }

        results.push({
          filter: filter.name,
          platform: filter.source,
          propertiesFound: result.properties?.length || 0
        })

      } catch (error) {
        console.error(`Error en filtro ${filter.name}:`, error)
        results.push({
          filter: filter.name,
          platform: filter.source,
          error: 'Failed'
        })
      }
    }

    // Verificar alarmas si hay propiedades nuevas
    if (totalNewProperties > 0) {
      console.log(`🔔 ${totalNewProperties} propiedades nuevas, verificando alarmas...`)
      
      // Obtener propiedades nuevas
      const { data: newProps } = await supabase
        .from('captured_properties')
        .select('*')
        .eq('status', 'new')
        .is('notified_at', null)
        .limit(totalNewProperties)

      // Obtener alarmas activas
      const { data: alarms } = await supabase
        .from('property_alarms')
        .select('*')
        .eq('is_active', true)

      if (newProps && alarms && alarms.length > 0) {
        for (const prop of newProps) {
          for (const alarm of alarms) {
            if (meetsAlarmConditions(prop, alarm)) {
              // Enviar notificación WhatsApp
              await sendWhatsAppNotification(prop, alarm)
              
              // Marcar como notificada
              await supabase
                .from('captured_properties')
                .update({ notified_at: new Date().toISOString() })
                .eq('id', prop.id)
            }
          }
        }
      }
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      filtersExecuted: filters.length,
      newProperties: totalNewProperties,
      results
    }

    console.log('✅ Sincronización completada:', summary)

    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ Error en sincronización automática:', error)
    return NextResponse.json(
      { 
        error: 'Error en sincronización',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Verificar si una propiedad cumple condiciones de alarma
function meetsAlarmConditions(property: Property, alarm: Alarm): boolean {
  const { data } = property
  const { conditions } = alarm

  if (conditions.maxPrice && data.price && data.price > conditions.maxPrice) return false
  if (conditions.minRooms && data.rooms && data.rooms < conditions.minRooms) return false
  if (conditions.minSurface && data.surface && data.surface < conditions.minSurface) return false
  if (conditions.cities && data.city && !conditions.cities.includes(data.city)) return false
  if (conditions.propertyTypes && data.propertyType && !conditions.propertyTypes.includes(data.propertyType)) return false

  return true
}

// Enviar notificación por WhatsApp
async function sendWhatsAppNotification(property: Property, alarm: Alarm) {
  try {
    const message = `🏠 *Nueva Propiedad!*\n\n` +
      `📍 ${property.data.city || 'N/A'}\n` +
      `💰 ${formatPrice(property.data.price)}\n` +
      `📐 ${property.data.surface || 'N/A'} m²\n` +
      `🛏️ ${property.data.rooms || 'N/A'} hab.\n` +
      `🏢 ${property.source.toUpperCase()}\n\n` +
      `🔗 ${property.source_url}`

    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://vendoya-75k9fzqpf-borinkens-projects.vercel.app'}/api/whatsapp/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: alarm.whatsapp_number,
          message
        })
      }
    )

    console.log(`📱 Notificación WhatsApp enviada para propiedad ${property.source_id}`)
  } catch (error) {
    console.error('Error enviando notificación WhatsApp:', error)
  }
}

function formatPrice(price?: number): string {
  if (!price) return 'N/A'
  return new Intl.NumberFormat('es-ES', { 
    style: 'currency', 
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(price)
}
