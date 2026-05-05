import OpenAI from 'openai'

// Configuración flexible: Groq (GRATIS) u OpenAI
const useGroq = true // Cambiar a false para usar OpenAI
const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY
const baseURL = useGroq ? 'https://api.groq.com/openai/v1' : undefined

const openai = new OpenAI({
  apiKey: apiKey || 'demo-key',
  baseURL
})

interface PropertyData {
  price: number
  location: string
  size: number // m²
  rooms: number
  yearBuilt?: number
  condition?: 'new' | 'good' | 'needsRenovation'
  rentalPrice?: number // precio alquiler mensual estimado
  expenses?: number // gastos mensuales (comunidad, IBI, etc)
}

interface InvestmentAnalysis {
  score: number // 0-100
  roi: number // % anual
  cashflow: number // mensual
  paybackYears: number
  appreciation: number // % valorización esperada/año
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: 'buy' | 'negotiate' | 'pass'
  reasoning: string
  strengths: string[]
  risks: string[]
  marketInsights: string
}

export async function analyzeInvestment(property: PropertyData): Promise<InvestmentAnalysis> {
  
  // 1. CÁLCULOS BÁSICOS
  const pricePerSqm = property.price / property.size
  
  // Estimar alquiler si no se proporciona (€/m² promedio Madrid)
  const avgRentPerSqm = getAverageRentPerSqm(property.location)
  const estimatedRent = property.rentalPrice || (property.size * avgRentPerSqm)
  
  // Gastos típicos (si no se proporcionan)
  const monthlyExpenses = property.expenses || (property.price * 0.01 / 12) // 1% anual
  
  // ROI bruto
  const annualRent = estimatedRent * 12
  const annualExpenses = monthlyExpenses * 12
  const netAnnualIncome = annualRent - annualExpenses
  const roi = (netAnnualIncome / property.price) * 100
  
  // Cashflow mensual
  const monthlyCashflow = estimatedRent - monthlyExpenses
  
  // Años para recuperar inversión
  const paybackYears = property.price / netAnnualIncome
  
  // 2. ANÁLISIS CON IA
  const aiPrompt = `
Eres un experto analista de inversiones inmobiliarias. Analiza esta propiedad:

DATOS:
- Precio: ${property.price.toLocaleString('es-ES')}€
- Ubicación: ${property.location}
- Tamaño: ${property.size}m²
- Habitaciones: ${property.rooms}
- Precio/m²: ${pricePerSqm.toFixed(0)}€/m²
- Alquiler estimado: ${estimatedRent.toFixed(0)}€/mes
- ROI calculado: ${roi.toFixed(2)}%
- Cashflow mensual: ${monthlyCashflow.toFixed(0)}€
- Años recuperación: ${paybackYears.toFixed(1)}

CONTEXTO MERCADO MADRID 2026:
- Precio medio: 3,500€/m²
- ROI medio alquiler: 4-5%
- Valorización esperada: 3-5% anual

Proporciona análisis en formato JSON:
{
  "appreciation": número (% valorización esperada anual),
  "riskLevel": "low" | "medium" | "high",
  "recommendation": "buy" | "negotiate" | "pass",
  "reasoning": "explicación breve de por qué",
  "strengths": ["punto fuerte 1", "punto fuerte 2", "punto fuerte 3"],
  "risks": ["riesgo 1", "riesgo 2"],
  "marketInsights": "análisis del mercado en esa zona"
}
`

  try {
    const completion = await openai.chat.completions.create({
      model: useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4',
      messages: [{ role: 'user', content: aiPrompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const aiAnalysis = JSON.parse(completion.choices[0].message.content || '{}')
    
    // 3. CALCULAR SCORE (0-100)
    const score = calculateInvestmentScore({
      roi,
      pricePerSqm,
      cashflow: monthlyCashflow,
      location: property.location,
      appreciation: aiAnalysis.appreciation,
      riskLevel: aiAnalysis.riskLevel
    })

    return {
      score,
      roi: parseFloat(roi.toFixed(2)),
      cashflow: parseFloat(monthlyCashflow.toFixed(0)),
      paybackYears: parseFloat(paybackYears.toFixed(1)),
      appreciation: aiAnalysis.appreciation,
      riskLevel: aiAnalysis.riskLevel,
      recommendation: aiAnalysis.recommendation,
      reasoning: aiAnalysis.reasoning,
      strengths: aiAnalysis.strengths,
      risks: aiAnalysis.risks,
      marketInsights: aiAnalysis.marketInsights
    }
    
  } catch (error) {
    console.error('Error en análisis IA:', error)
    
    // Fallback: análisis básico sin IA
    return {
      score: calculateBasicScore(roi, pricePerSqm),
      roi: parseFloat(roi.toFixed(2)),
      cashflow: parseFloat(monthlyCashflow.toFixed(0)),
      paybackYears: parseFloat(paybackYears.toFixed(1)),
      appreciation: 4, // promedio conservador
      riskLevel: roi > 5 ? 'low' : roi > 3 ? 'medium' : 'high',
      recommendation: roi > 5 ? 'buy' : roi > 3 ? 'negotiate' : 'pass',
      reasoning: `ROI de ${roi.toFixed(1)}% ${roi > 5 ? 'excelente' : roi > 3 ? 'aceptable' : 'bajo'}`,
      strengths: [
        roi > 4 ? 'Buena rentabilidad' : 'Ubicación',
        monthlyCashflow > 0 ? 'Cashflow positivo' : 'Potencial valorización'
      ],
      risks: [
        roi < 4 ? 'ROI bajo para inversión' : 'Posibles gastos imprevistos',
        'Volatilidad del mercado'
      ],
      marketInsights: 'Análisis básico sin conexión IA'
    }
  }
}

function getAverageRentPerSqm(location: string): number {
  // Precios promedio alquiler por zona en Madrid (2026)
  const rentPrices: Record<string, number> = {
    'madrid centro': 18,
    'madrid salamanca': 17,
    'madrid chamberi': 16,
    'madrid retiro': 16,
    'madrid chamartin': 15,
    'default': 13
  }
  
  const locationLower = location.toLowerCase()
  for (const [zone, price] of Object.entries(rentPrices)) {
    if (locationLower.includes(zone)) return price
  }
  return rentPrices.default
}

function calculateInvestmentScore(params: {
  roi: number
  pricePerSqm: number
  cashflow: number
  location: string
  appreciation: number
  riskLevel: string
}): number {
  let score = 50 // base
  
  // ROI (máx 30 puntos)
  if (params.roi > 7) score += 30
  else if (params.roi > 5) score += 20
  else if (params.roi > 3) score += 10
  else score -= 10
  
  // Precio/m² competitivo (máx 20 puntos)
  if (params.pricePerSqm < 3000) score += 20
  else if (params.pricePerSqm < 3500) score += 10
  else if (params.pricePerSqm > 4500) score -= 10
  
  // Cashflow (máx 15 puntos)
  if (params.cashflow > 500) score += 15
  else if (params.cashflow > 200) score += 10
  else if (params.cashflow > 0) score += 5
  else score -= 15
  
  // Valorización esperada (máx 15 puntos)
  if (params.appreciation > 5) score += 15
  else if (params.appreciation > 3) score += 10
  else score += 5
  
  // Riesgo (máx 10 puntos)
  if (params.riskLevel === 'low') score += 10
  else if (params.riskLevel === 'medium') score += 5
  else score -= 5
  
  // Ubicación premium (máx 10 puntos)
  const premiumZones = ['centro', 'salamanca', 'chamberi', 'retiro']
  if (premiumZones.some(z => params.location.toLowerCase().includes(z))) {
    score += 10
  }
  
  return Math.max(0, Math.min(100, score))
}

function calculateBasicScore(roi: number, pricePerSqm: number): number {
  let score = 50
  if (roi > 6) score += 30
  else if (roi > 4) score += 15
  else score -= 10
  
  if (pricePerSqm < 3500) score += 20
  else if (pricePerSqm > 4500) score -= 10
  
  return Math.max(0, Math.min(100, score))
}

// PROYECCIÓN A 5 AÑOS
export function projectInvestment(
  initialPrice: number,
  annualAppreciation: number,
  monthlyRent: number,
  monthlyExpenses: number,
  years: number = 5
) {
  const projection = []
  let currentValue = initialPrice
  
  for (let year = 1; year <= years; year++) {
    currentValue = currentValue * (1 + annualAppreciation / 100)
    const annualRent = monthlyRent * 12
    const annualExpenses = monthlyExpenses * 12
    const netIncome = annualRent - annualExpenses
    const equity = currentValue - initialPrice
    const totalReturn = equity + (netIncome * year)
    const returnOnInvestment = (totalReturn / initialPrice) * 100
    
    projection.push({
      year,
      propertyValue: Math.round(currentValue),
      equity: Math.round(equity),
      totalReturn: Math.round(totalReturn),
      roi: parseFloat(returnOnInvestment.toFixed(2))
    })
  }
  
  return projection
}
