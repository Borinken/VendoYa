'use client'

import { useState } from 'react'
import { 
  TrendingUp, Calculator, DollarSign, PieChart, 
  AlertTriangle, CheckCircle2, Download,
  Home, MapPin, Maximize2, BedDouble, Calendar, Info
} from 'lucide-react'

interface InvestmentForm {
  price: number
  location: string
  size: number
  rooms: number
  yearBuilt?: number
  condition?: 'new' | 'good' | 'needsRenovation'
  rentalPrice?: number
  expenses?: number
}

interface InvestmentAnalysis {
  score: number
  roi: number
  cashflow: number
  paybackYears: number
  appreciation: number
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: 'buy' | 'negotiate' | 'pass'
  reasoning: string
  strengths: string[]
  risks: string[]
  marketInsights: string
}

interface ProjectionYear {
  year: number
  propertyValue: number
  equity: number
  totalReturn: number
  roi: number
}

export default function InvestorsPage() {
  const [formData, setFormData] = useState<InvestmentForm>({
    price: 0,
    location: '',
    size: 0,
    rooms: 0
  })
  
  const [analysis, setAnalysis] = useState<InvestmentAnalysis | null>(null)
  const [projection, setProjection] = useState<ProjectionYear[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/investment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error en análisis')
      }
      
      const result = await response.json()
      setAnalysis(result.analysis)
      setProjection(result.projection)
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-blue-600 bg-blue-50'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getRiskColor = (risk: string) => {
    if (risk === 'low') return 'text-green-600 bg-green-50'
    if (risk === 'medium') return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getRecommendationColor = (rec: string) => {
    if (rec === 'buy') return 'text-green-600 bg-green-50'
    if (rec === 'negotiate') return 'text-blue-600 bg-blue-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600 rounded-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Análisis de Inversión Inmobiliaria
            </h1>
            <p className="text-gray-600 mt-1">
              Análisis profesional con IA en 30 segundos
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* FORMULARIO */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Datos de la Propiedad
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Precio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Precio de compra *
                  </div>
                </label>
                <input
                  type="number"
                  required
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="285000"
                />
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación *
                  </div>
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Madrid Centro"
                />
              </div>

              {/* Tamaño y Habitaciones */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4" />
                      m² *
                    </div>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.size || ''}
                    onChange={(e) => setFormData({ ...formData, size: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="85"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-4 h-4" />
                      Habitaciones *
                    </div>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.rooms || ''}
                    onChange={(e) => setFormData({ ...formData, rooms: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="3"
                  />
                </div>
              </div>

              {/* Año construcción (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Año de construcción (opcional)
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.yearBuilt || ''}
                  onChange={(e) => setFormData({ ...formData, yearBuilt: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2010"
                />
              </div>

              {/* Alquiler estimado (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Alquiler mensual estimado (opcional)
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.rentalPrice || ''}
                  onChange={(e) => setFormData({ ...formData, rentalPrice: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1400"
                />
              </div>

              {/* Gastos mensuales (opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Gastos mensuales (opcional)
                  </div>
                </label>
                <input
                  type="number"
                  value={formData.expenses || ''}
                  onChange={(e) => setFormData({ ...formData, expenses: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="150"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comunidad, IBI, seguros, etc.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" />
                    Analizar Inversión
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* RESULTADOS */}
          <div className="space-y-6">
            {!analysis ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PieChart className="w-12 h-12 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Análisis Profesional con IA
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Completa el formulario para obtener un análisis detallado de la inversión,
                  ROI proyectado, riesgos y recomendaciones personalizadas.
                </p>
              </div>
            ) : (
              <>
                {/* Score Principal */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      SCORE DE INVERSIÓN
                    </p>
                    <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreColor(analysis.score)} mb-4`}>
                      <span className="text-5xl font-bold">
                        {analysis.score}
                      </span>
                    </div>
                    <div className={`inline-block px-6 py-3 rounded-full ${getRecommendationColor(analysis.recommendation)}`}>
                      <p className="font-bold uppercase tracking-wide">
                        {analysis.recommendation === 'buy' && '✓ COMPRAR'}
                        {analysis.recommendation === 'negotiate' && '→ NEGOCIAR'}
                        {analysis.recommendation === 'pass' && '✗ PASAR'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas Clave */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-medium text-gray-600">ROI Anual</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {analysis.roi.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <p className="text-sm font-medium text-gray-600">Cashflow</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {analysis.cashflow.toLocaleString('es-ES')}€
                      <span className="text-sm font-normal text-gray-600">/mes</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <p className="text-sm font-medium text-gray-600">Recuperación</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {analysis.paybackYears.toFixed(1)}
                      <span className="text-sm font-normal text-gray-600"> años</span>
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <p className="text-sm font-medium text-gray-600">Riesgo</p>
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-lg ${getRiskColor(analysis.riskLevel)} font-bold uppercase text-sm`}>
                      {analysis.riskLevel === 'low' && 'Bajo'}
                      {analysis.riskLevel === 'medium' && 'Medio'}
                      {analysis.riskLevel === 'high' && 'Alto'}
                    </div>
                  </div>
                </div>

                {/* Análisis Detallado */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Análisis Detallado
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Reasoning */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        <p className="font-medium text-gray-900">Conclusión</p>
                      </div>
                      <p className="text-gray-700 pl-7">
                        {analysis.reasoning}
                      </p>
                    </div>

                    {/* Fortalezas */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="font-medium text-gray-900">Fortalezas</p>
                      </div>
                      <ul className="space-y-2 pl-7">
                        {analysis.strengths.map((strength, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-green-600 mt-1">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Riesgos */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <p className="font-medium text-gray-900">Riesgos</p>
                      </div>
                      <ul className="space-y-2 pl-7">
                        {analysis.risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-orange-600 mt-1">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Market Insights */}
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <p className="text-sm font-medium text-blue-900 mb-2">
                        Análisis de Mercado
                      </p>
                      <p className="text-sm text-blue-800">
                        {analysis.marketInsights}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Proyección 5 años */}
                {projection.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                      Proyección a 5 Años
                    </h3>
                    
                    <div className="space-y-4">
                      {projection.map((year) => (
                        <div key={year.year} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                              {year.year}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Valor propiedad</p>
                              <p className="text-xl font-bold text-gray-900">
                                {year.propertyValue.toLocaleString('es-ES')}€
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">ROI Acumulado</p>
                            <p className={`text-xl font-bold ${year.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              +{year.roi.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón Descargar Reporte */}
                <button className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Descargar Reporte PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
