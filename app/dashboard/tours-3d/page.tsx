'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Eye, Trash2, Image, Loader2, AlertCircle, Box, Download } from 'lucide-react'
import GaussianSplatViewer from '@/components/GaussianSplatViewer'
import PhotoUploader3D from '@/components/PhotoUploader3D'

interface Property {
  id: string
  title: string
  city: string
  data: {
    address?: string
    images?: string[]
  }
}

interface Tour3D {
  id: string
  property_id: string
  splat_file_url: string | null
  preview_image_url: string | null
  photo_count: number
  processing_status: 'pending' | 'processing' | 'completed' | 'failed'
  file_size_mb: number | null
  quality_score: number | null
  view_count: number
  created_at: string
  property_title?: string
  property_city?: string
  property_address?: string
}

export default function Tours3DPage() {
  const [tours, setTours] = useState<Tour3D[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploader, setShowUploader] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<string>('')
  const [viewingTour, setViewingTour] = useState<Tour3D | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Cargar tours 3D
      const { data: toursData, error: toursError } = await supabase
        .from('property_3d_tours_view')
        .select('*')
        .order('created_at', { ascending: false })

      if (toursError) throw toursError
      setTours(toursData || [])

      // Cargar propiedades sin tour 3D
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, city, data')
        .order('created_at', { ascending: false })
        .limit(100)

      if (propertiesError) throw propertiesError
      setProperties(propertiesData || [])

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadComplete = (splatUrl: string) => {
    setShowUploader(false)
    setSelectedProperty('')
    loadData()
  }

  const deleteTour = async (tourId: string) => {
    if (!confirm('¿Eliminar este tour 3D?')) return

    try {
      const { error } = await supabase
        .from('property_3d_tours')
        .delete()
        .eq('id', tourId)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error('Error deleting tour:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Box className="w-8 h-8 text-blue-600" />
              Tours 3D con Gaussian Splatting
            </h1>
            <p className="text-gray-600 mt-2">
              Crea recorridos 3D fotorrealistas de tus propiedades
            </p>
          </div>
          <button
            onClick={() => setShowUploader(!showUploader)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Tour 3D
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-blue-600 rounded-lg p-3">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-2">
              ¿Qué es 3D Gaussian Splatting?
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              Tecnología de vanguardia que crea reconstrucciones 3D fotorrealistas a partir de fotos normales. 
              Permite a tus clientes explorar propiedades de forma inmersiva desde cualquier dispositivo.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-700">100% gratis y open source</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-700">Calidad fotorrealista</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-700">Renderizado en tiempo real</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uploader Modal */}
      {showUploader && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Crear Nuevo Tour 3D
            </h2>
            <button
              onClick={() => setShowUploader(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Selector de propiedad */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Selecciona la propiedad:
            </label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Selecciona una propiedad --</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.title} - {property.city}
                </option>
              ))}
            </select>
          </div>

          {selectedProperty && (
            <PhotoUploader3D
              propertyId={selectedProperty}
              onUploadComplete={handleUploadComplete}
            />
          )}
        </div>
      )}

      {/* Tours Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map(tour => (
          <div
            key={tour.id}
            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden border border-gray-200"
          >
            {/* Preview */}
            <div className="relative h-48 bg-gray-900">
              {tour.preview_image_url ? (
                <img
                  src={tour.preview_image_url}
                  alt={tour.property_title || 'Tour 3D'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-12 h-12 text-gray-600" />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                {tour.processing_status === 'completed' && (
                  <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    ✓ Completado
                  </span>
                )}
                {tour.processing_status === 'processing' && (
                  <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Procesando
                  </span>
                )}
                {tour.processing_status === 'failed' && (
                  <span className="bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    ✗ Error
                  </span>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-1">
                {tour.property_title || 'Sin título'}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {tour.property_city || 'Sin ubicación'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  <span>{tour.photo_count} fotos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{tour.view_count} vistas</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {tour.processing_status === 'completed' && (
                  <button
                    onClick={() => setViewingTour(tour)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Tour
                  </button>
                )}
                <button
                  onClick={() => deleteTour(tour.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold py-2 px-3 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tours.length === 0 && (
        <div className="text-center py-16">
          <Box className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No hay tours 3D todavía
          </h3>
          <p className="text-gray-500 mb-6">
            Crea tu primer tour 3D para empezar
          </p>
          <button
            onClick={() => setShowUploader(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Crear Tour 3D
          </button>
        </div>
      )}

      {/* Viewer Modal */}
      {viewingTour && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {viewingTour.property_title}
                </h2>
                <p className="text-sm text-gray-600">
                  {viewingTour.property_city}
                </p>
              </div>
              <button
                onClick={() => setViewingTour(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1">
              {viewingTour.splat_file_url ? (
                <GaussianSplatViewer
                  splatUrl={viewingTour.splat_file_url}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Tour 3D no disponible</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
