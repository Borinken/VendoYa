'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface PhotoUploader3DProps {
  propertyId: string
  onUploadComplete?: (splatUrl: string) => void
}

export default function PhotoUploader3D({ 
  propertyId, 
  onUploadComplete 
}: PhotoUploader3DProps) {
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validar número de fotos
    if (files.length < 20) {
      setError('Se necesitan al menos 20 fotos para crear un tour 3D de calidad')
      return
    }
    
    if (files.length > 100) {
      setError('Máximo 100 fotos permitidas')
      return
    }

    // Validar que sean imágenes
    const validFiles = files.filter(file => file.type.startsWith('image/'))
    if (validFiles.length !== files.length) {
      setError('Todos los archivos deben ser imágenes')
      return
    }

    setPhotos(validFiles)
    setError(null)
  }, [])

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (photos.length < 20) {
      setError('Se necesitan al menos 20 fotos')
      return
    }

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      // 1. Subir fotos a Supabase Storage
      const uploadPromises = photos.map(async (photo, index) => {
        const formData = new FormData()
        formData.append('file', photo)
        formData.append('propertyId', propertyId)
        formData.append('index', index.toString())

        const response = await fetch('/api/properties/upload-3d-photos', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Error al subir foto')
        
        setProgress(Math.round(((index + 1) / photos.length) * 50))
        return response.json()
      })

      const uploadedPhotos = await Promise.all(uploadPromises)
      
      // 2. Procesar fotos para crear el modelo 3D
      setProcessing(true)
      setProgress(50)

      const processResponse = await fetch('/api/properties/process-3d-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          photos: uploadedPhotos,
        }),
      })

      if (!processResponse.ok) {
        throw new Error('Error al procesar el tour 3D')
      }

      const { splatUrl } = await processResponse.json()
      setProgress(100)
      setSuccess(true)
      
      if (onUploadComplete) {
        onUploadComplete(splatUrl)
      }

      // Reset después de 2 segundos
      setTimeout(() => {
        setPhotos([])
        setSuccess(false)
        setProgress(0)
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Información de ayuda */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-2">📸 Cómo tomar las fotos:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Toma entre 20-50 fotos de toda la propiedad</li>
              <li>Captura cada habitación desde múltiples ángulos</li>
              <li>Mantén el móvil horizontal y estable</li>
              <li>Avanza lentamente cubriendo toda la superficie</li>
              <li>Asegúrate de que haya buena iluminación</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Zona de carga */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="photo-upload-3d"
          disabled={uploading || processing}
        />
        <label
          htmlFor="photo-upload-3d"
          className="cursor-pointer block"
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Arrastra tus fotos o haz click para seleccionar
          </p>
          <p className="text-sm text-gray-500">
            Mínimo 20 fotos • Máximo 100 fotos • Formato JPG, PNG
          </p>
        </label>
      </div>

      {/* Galería de fotos seleccionadas */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {photos.length} fotos seleccionadas
            </p>
            {photos.length >= 20 && (
              <span className="text-xs text-green-600 font-medium">
                ✓ Suficientes fotos
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {photos.map((photo, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={uploading || processing}
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de progreso */}
      {(uploading || processing) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">
              {uploading && 'Subiendo fotos...'}
              {processing && 'Procesando tour 3D...'}
            </span>
            <span className="text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {processing && '⚡ Esto puede tomar 5-10 minutos...'}
          </p>
        </div>
      )}

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">
            ¡Tour 3D creado exitosamente!
          </p>
        </div>
      )}

      {/* Botón de acción */}
      <button
        onClick={handleUpload}
        disabled={photos.length < 20 || uploading || processing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {(uploading || processing) ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <ImageIcon className="w-5 h-5" />
            <span>Crear Tour 3D ({photos.length} fotos)</span>
          </>
        )}
      </button>
    </div>
  )
}
