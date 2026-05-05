'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, Plus, Trash2, Eye, Power, MapPin, Home, Euro, Layers, Search, MessageCircle, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface CaptureFilter {
  id?: string
  name: string
  source: 'realadvisor' | 'idealista' | 'fotocasa' | 'all'
  operation_type: 'sale' | 'rent' | 'all'
  property_type: string
  city: string
  min_price?: number
  max_price?: number
  min_surface?: number
  max_surface?: number
  min_rooms?: number
  notify_whatsapp: boolean
  whatsapp_number?: string
  is_active: boolean
  last_run?: string
  properties_found?: number
}

const PROPERTY_SOURCES = [
  { id: 'all', name: 'Todas las fuentes', color: 'bg-gray-500' },
  { id: 'idealista', name: 'Idealista', color: 'bg-yellow-500' },
  { id: 'fotocasa', name: 'Fotocasa', color: 'bg-blue-500' },
  { id: 'realadvisor', name: 'RealAdvisor', color: 'bg-emerald-500' },
]

const PROPERTY_TYPES = ['Todos', 'Piso', 'Casa', 'Chalet', 'Ático', 'Dúplex', 'Estudio', 'Local', 'Oficina', 'Garaje']

export default function CapturePage() {
  const [filters, setFilters] = useState<CaptureFilter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFilter, setEditingFilter] = useState<CaptureFilter | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [lastResults, setLastResults] = useState<{
    filterName: string
    source: string
    count: number
    whatsappSent: boolean
    whatsappNumber?: string
  }[]>([])

  // Form state
  const [formData, setFormData] = useState<CaptureFilter>({
    name: '',
    source: 'all',
    operation_type: 'all',
    property_type: 'Todos',
    city: '',
    notify_whatsapp: false,
    is_active: true,
  })

  useEffect(() => {
    loadFilters()
  }, [])

  const loadFilters = async () => {
    try {
      const { data, error } = await supabase
        .from('capture_filters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setFilters(data || [])
    } catch (error) {
      console.error('Error loading filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveFilter = async () => {
    try {
      if (editingFilter?.id) {
        // Update existing
        const { error } = await supabase
          .from('capture_filters')
          .update(formData)
          .eq('id', editingFilter.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('capture_filters')
          .insert([formData])

        if (error) throw error
      }

      await loadFilters()
      resetForm()
      alert('Filtro guardado correctamente')
    } catch (error) {
      console.error('Error saving filter:', error)
      alert('Error al guardar el filtro')
    }
  }

  const deleteFilter = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este filtro?')) return

    try {
      const { error } = await supabase
        .from('capture_filters')
        .delete()
        .eq('id', id)

      if (error) throw error
      await loadFilters()
    } catch (error) {
      console.error('Error deleting filter:', error)
      alert('Error al eliminar el filtro')
    }
  }

  const toggleFilterStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('capture_filters')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      await loadFilters()
    } catch (error) {
      console.error('Error toggling filter:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      source: 'all',
      operation_type: 'all',
      property_type: 'Todos',
      city: '',
      notify_whatsapp: false,
      is_active: true,
    })
    setEditingFilter(null)
    setShowForm(false)
  }

  const editFilter = (filter: CaptureFilter) => {
    setFormData(filter)
    setEditingFilter(filter)
    setShowForm(true)
  }

  const runCapture = async (filterId?: string) => {
    setCapturing(true)
    setLastResults([])

    try {
      const filtersToRun = filterId 
        ? filters.filter(f => f.id === filterId && f.is_active)
        : filters.filter(f => f.is_active)

      if (filtersToRun.length === 0) {
        alert('No hay filtros activos para ejecutar')
        return
      }

      const results = []

      for (const filter of filtersToRun) {
        try {
          // Llamar a la API de scraping real
          const response = await fetch('/api/scraping/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter })
          })

          const data = await response.json()
          
          if (!response.ok) {
            console.error(`Error en scraping para ${filter.name}:`, data.error)
            results.push({
              filterName: filter.name,
              source: filter.source,
              count: 0,
              whatsappSent: false,
              error: data.error
            })
            continue
          }

          const foundCount = data.count || 0
          
          // Actualizar estadísticas del filtro
          await supabase
            .from('capture_filters')
            .update({ 
              last_run: new Date().toISOString(),
              properties_found: foundCount 
            })
            .eq('id', filter.id!)

          results.push({
            filterName: filter.name,
            source: filter.source,
            count: foundCount,
            whatsappSent: false,
            whatsappNumber: filter.whatsapp_number
          })

          // Enviar WhatsApp si está activado y se encontraron propiedades
          if (filter.notify_whatsapp && filter.whatsapp_number && foundCount > 0) {
            const whatsappSent = await sendWhatsAppNotification(
              filter.whatsapp_number, 
              foundCount, 
              filter.name
            )
            results[results.length - 1].whatsappSent = whatsappSent
          }
        } catch (error) {
          console.error(`Error procesando filtro ${filter.name}:`, error)
          results.push({
            filterName: filter.name,
            source: filter.source,
            count: 0,
            whatsappSent: false,
            error: 'Error en la captura'
          })
        }
      }

      setLastResults(results)
      await loadFilters()
      
      const totalFound = results.reduce((sum, r) => sum + r.count, 0)
      const totalSent = results.filter(r => r.whatsappSent).length
      
      alert(
        `Captura completada:\n` +
        `✓ ${totalFound} propiedades encontradas\n` +
        (totalSent > 0 ? `✓ ${totalSent} notificaciones enviadas por WhatsApp` : '')
      )
    } catch (error) {
      console.error('Error running capture:', error)
      alert('Error al ejecutar la captura')
    } finally {
      setCapturing(false)
    }
  }

  const sendWhatsAppNotification = async (phone: string, count: number, filterName: string): Promise<boolean> => {
    try {
      const message = `🏠 *Vendoya CRM - Nueva Captura*\n\n` +
        `Se encontraron *${count} nuevas propiedades* que coinciden con tu filtro:\n\n` +
        `📋 Filtro: ${filterName}\n` +
        `⏰ Fecha: ${new Date().toLocaleString('es-ES')}\n\n` +
        `Revisa el CRM para ver los detalles completos.`

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Error enviando WhatsApp:', data.error)
        return false
      }

      console.log(`✓ WhatsApp enviado a ${phone}: ${count} propiedades`)
      return true
    } catch (error) {
      console.error('Error en sendWhatsAppNotification:', error)
      return false
    }
  }

  const getSourceColor = (source: string) => {
    return PROPERTY_SOURCES.find(s => s.id === source)?.color || 'bg-gray-500'
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Captura Automática
            </h1>
            <p className="text-gray-600 text-lg">
              Configura filtros para capturar propiedades automáticamente desde portales inmobiliarios
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => runCapture()}
              disabled={capturing || filters.filter(f => f.is_active).length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {capturing ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Capturando...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Ejecutar Captura</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all duration-300 font-medium shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Filtro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Filtros Activos</p>
          <p className="text-3xl font-bold text-gray-900">{filters.filter(f => f.is_active).length}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Propiedades Capturadas</p>
          <p className="text-3xl font-bold text-gray-900">
            {filters.reduce((sum, f) => sum + (f.properties_found || 0), 0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-violet-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Con WhatsApp</p>
          <p className="text-3xl font-bold text-gray-900">
            {filters.filter(f => f.notify_whatsapp).length}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Última Ejecución</p>
          <p className="text-sm font-semibold text-gray-900">
            {filters.length > 0 && filters[0].last_run 
              ? new Date(filters[0].last_run).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
              : 'Nunca'}
          </p>
        </div>
      </div>

      {/* Last Results */}
      {lastResults.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Resultados de la última captura</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lastResults.map((result, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{result.filterName}</p>
                      <span className={`px-2 py-1 ${getSourceColor(result.source)} text-white text-xs rounded-full font-medium`}>
                        {PROPERTY_SOURCES.find(s => s.id === result.source)?.name}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mb-2">{result.count} propiedades</p>
                    {result.whatsappSent && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                        <span>WhatsApp enviado a {result.whatsappNumber}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingFilter ? 'Editar Filtro' : 'Nuevo Filtro de Captura'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Filtro *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej: Pisos en Madrid Centro hasta 300k"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Fuente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portal Inmobiliario *
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value as CaptureFilter['source'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PROPERTY_SOURCES.map(source => (
                  <option key={source.id} value={source.id}>{source.name}</option>
                ))}
              </select>
            </div>

            {/* Operación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Operación *
              </label>
              <select
                value={formData.operation_type}
                onChange={(e) => setFormData({ ...formData, operation_type: e.target.value as CaptureFilter['operation_type'] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Todas</option>
                <option value="sale">Venta</option>
                <option value="rent">Alquiler</option>
              </select>
            </div>

            {/* Tipo de Propiedad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Propiedad
              </label>
              <select
                value={formData.property_type}
                onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PROPERTY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Madrid"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Precio Mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio Mínimo (€)
              </label>
              <input
                type="number"
                value={formData.min_price || ''}
                onChange={(e) => setFormData({ ...formData, min_price: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="150000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Precio Máximo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio Máximo (€)
              </label>
              <input
                type="number"
                value={formData.max_price || ''}
                onChange={(e) => setFormData({ ...formData, max_price: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="300000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Superficie Mínima */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Superficie Mínima (m²)
              </label>
              <input
                type="number"
                value={formData.min_surface || ''}
                onChange={(e) => setFormData({ ...formData, min_surface: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="80"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Habitaciones Mínimas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Habitaciones Mínimas
              </label>
              <input
                type="number"
                value={formData.min_rooms || ''}
                onChange={(e) => setFormData({ ...formData, min_rooms: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* WhatsApp */}
            <div className="md:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <input
                      type="checkbox"
                      id="notify_whatsapp"
                      checked={formData.notify_whatsapp}
                      onChange={(e) => setFormData({ ...formData, notify_whatsapp: e.target.checked })}
                      className="w-5 h-5 text-emerald-500 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="notify_whatsapp" className="text-lg font-semibold text-gray-900">
                      Notificar por WhatsApp
                    </label>
                  </div>
                  {formData.notify_whatsapp && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número de WhatsApp (con código de país)
                      </label>
                      <input
                        type="tel"
                        value={formData.whatsapp_number || ''}
                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                        placeholder="+34 600 123 456"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Recibirás un mensaje instantáneo cuando se encuentren propiedades que coincidan con este filtro
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={saveFilter}
              disabled={!formData.name || !formData.city}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingFilter ? 'Actualizar Filtro' : 'Crear Filtro'}
            </button>
          </div>
        </div>
      )}

      {/* Filters List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando filtros...</p>
        </div>
      ) : filters.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No hay filtros configurados</h3>
          <p className="text-gray-600 mb-6">
            Crea tu primer filtro para comenzar a capturar propiedades automáticamente
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Primer Filtro</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className={`bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
                filter.is_active ? 'border-emerald-200 shadow-sm' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{filter.name}</h3>
                    <span className={`px-3 py-1 ${getSourceColor(filter.source)} text-white text-xs rounded-full font-medium`}>
                      {PROPERTY_SOURCES.find(s => s.id === filter.source)?.name}
                    </span>
                    {filter.is_active && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center space-x-1">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span>Activo</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{filter.city}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Home className="w-4 h-4" />
                      <span>{filter.property_type}</span>
                    </div>
                    {filter.min_price && (
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4" />
                        <span>Desde {filter.min_price.toLocaleString()}€</span>
                      </div>
                    )}
                    {filter.max_price && (
                      <div className="flex items-center space-x-2">
                        <Euro className="w-4 h-4" />
                        <span>Hasta {filter.max_price.toLocaleString()}€</span>
                      </div>
                    )}
                    {filter.min_surface && (
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4" />
                        <span>Mín {filter.min_surface}m²</span>
                      </div>
                    )}
                  </div>

                  {filter.notify_whatsapp && filter.whatsapp_number && (
                    <div className="mt-3 flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg w-fit">
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp: {filter.whatsapp_number}</span>
                    </div>
                  )}

                  {filter.last_run && (
                    <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Última ejecución: {new Date(filter.last_run).toLocaleString('es-ES')}</span>
                      </div>
                      {filter.properties_found !== undefined && (
                        <div className="flex items-center space-x-2 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{filter.properties_found} propiedades encontradas</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => runCapture(filter.id)}
                    disabled={!filter.is_active || capturing}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Ejecutar captura"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => toggleFilterStatus(filter.id!, filter.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      filter.is_active 
                        ? 'text-emerald-600 hover:bg-emerald-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={filter.is_active ? 'Desactivar' : 'Activar'}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => editFilter(filter)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteFilter(filter.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="mt-8 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Cómo funciona la captura automática?</h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span>Crea un filtro con los criterios de búsqueda (ciudad, precio, tipo de propiedad, etc.)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span>Activa las notificaciones por WhatsApp si quieres recibir alertas instantáneas</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span>El sistema captura automáticamente propiedades cada hora de Idealista, Fotocasa y RealAdvisor</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">4.</span>
                <span>Recibirás un mensaje en WhatsApp con el número de propiedades nuevas encontradas</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">5.</span>
                <span>Las propiedades se guardan automáticamente en tu base de datos para revisarlas después</span>
              </li>
            </ul>
            <div className="mt-4 bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600">
                <strong className="text-blue-600">💡 Consejo:</strong> Crea múltiples filtros para diferentes criterios de búsqueda y nunca te pierdas una oportunidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
