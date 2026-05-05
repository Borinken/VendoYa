import { NextRequest, NextResponse } from 'next/server'
import { analyzeInvestment, projectInvestment } from '@/lib/investment-analyzer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { price, location, size, rooms, yearBuilt, condition, rentalPrice, expenses } = body
    
    // Validaciones
    if (!price || !location || !size || !rooms) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: price, location, size, rooms' },
        { status: 400 }
      )
    }
    
    // Análisis principal
    const analysis = await analyzeInvestment({
      price: Number(price),
      location: String(location),
      size: Number(size),
      rooms: Number(rooms),
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      condition: condition as 'new' | 'good' | 'needsRenovation' | undefined,
      rentalPrice: rentalPrice ? Number(rentalPrice) : undefined,
      expenses: expenses ? Number(expenses) : undefined
    })
    
    // Proyección a 5 años
    const projection = projectInvestment(
      Number(price),
      analysis.appreciation,
      analysis.cashflow + (expenses || (price * 0.01 / 12)), // cashflow + gastos
      expenses || (price * 0.01 / 12),
      5
    )
    
    // Respuesta completa
    return NextResponse.json({
      success: true,
      property: {
        price,
        location,
        size,
        rooms,
        pricePerSqm: Math.round(price / size)
      },
      analysis,
      projection,
      generatedAt: new Date().toISOString()
    })
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error en análisis:', error)
    return NextResponse.json(
      { error: 'Error procesando análisis', details: errorMessage },
      { status: 500 }
    )
  }
}

// Endpoint GET para probar
export async function GET() {
  return NextResponse.json({
    message: 'Investment Analysis API',
    version: '1.0',
    endpoints: {
      POST: '/api/investment/analyze',
      body: {
        required: ['price', 'location', 'size', 'rooms'],
        optional: ['yearBuilt', 'condition', 'rentalPrice', 'expenses']
      }
    },
    example: {
      price: 285000,
      location: 'Madrid Centro',
      size: 85,
      rooms: 3,
      rentalPrice: 1400,
      expenses: 150
    }
  })
}
