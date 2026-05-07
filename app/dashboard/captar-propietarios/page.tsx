'use client';

import { useState } from 'react';
import { Upload, Home, TrendingUp, Clock, Shield, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

const URGENT_SITUATIONS = [
  { value: 'herencia', label: '🏠 Herencia recibida', description: 'Necesito vender una propiedad heredada' },
  { value: 'divorcio', label: '💔 Divorcio o separación', description: 'Liquidar bienes tras separación' },
  { value: 'embargo', label: '⚠️ Riesgo de embargo', description: 'Evitar pérdida por impagos' },
  { value: 'ruina', label: '🏚️ Propiedad en mal estado', description: 'Vivienda que necesita reformas costosas' },
  { value: 'mudanza', label: '✈️ Mudanza urgente', description: 'Cambio de ciudad o país' },
  { value: 'liquidez', label: '💰 Necesito liquidez YA', description: 'Urgencia financiera personal' },
  { value: 'okupacion', label: '🚫 Okupación', description: 'Propiedad okupada que quiero vender' },
  { value: 'otro', label: '📝 Otra situación', description: 'Cuéntanos tu caso' },
];

export default function VendeRapidoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    postalCode: '',
    propertyType: 'piso',
    urgentSituation: '',
    situationDetails: '',
    photos: [] as File[],
    name: '',
    email: '',
    phone: '',
    source: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('utm_source') || 'directo' : 'directo',
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5); // Máximo 5 fotos
      setFormData({ ...formData, photos: files });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Subir fotos primero
      const photoUrls: string[] = [];
      
      if (formData.photos.length > 0) {
        const uploadFormData = new FormData();
        formData.photos.forEach((photo, index) => {
          uploadFormData.append(`photo-${index}`, photo);
        });
        
        const uploadRes = await fetch('/api/upload/photos', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (uploadRes.ok) {
          const { urls } = await uploadRes.json();
          photoUrls.push(...urls);
        }
      }
      
      // Crear lead
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photos: photoUrls,
        }),
      });
      
      if (!response.ok) throw new Error('Error al crear lead');
      
      const { leadId } = await response.json();
      
      // Redirigir a página de valoración
      router.push(`/dashboard/captar-propietarios/valoracion/${leadId}`);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Vendoya</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>100% Confidencial</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {step === 1 && (
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              ¿Necesitas vender tu vivienda <span className="text-blue-600">rápido</span>?
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Recibe una valoración gratuita en menos de 2 minutos
            </p>
            <p className="text-lg text-gray-500">
              Sin compromiso • Sin visitas incómodas • Totalmente gratis
            </p>
          </div>

          {/* Beneficios */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-md text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Valoración instantánea</h3>
              <p className="text-gray-600">En menos de 2 minutos conocerás el valor de tu vivienda</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Máximo precio garantizado</h3>
              <p className="text-gray-600">Conectamos con +500 agencias para conseguirte la mejor oferta</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-md text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">100% confidencial</h3>
              <p className="text-gray-600">Tus datos están protegidos y nunca serán compartidos sin tu permiso</p>
            </div>
          </div>

          {/* Formulario Paso 1: Dirección */}
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Cuéntanos sobre tu vivienda</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dirección completa *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calle Gran Vía 28, 3º B"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    placeholder="Madrid"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    placeholder="28001"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de propiedad *
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="piso">Piso</option>
                  <option value="casa">Casa / Chalet</option>
                  <option value="atico">Ático</option>
                  <option value="duplex">Dúplex</option>
                  <option value="estudio">Estudio</option>
                  <option value="local">Local comercial</option>
                  <option value="terreno">Terreno</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formData.address || !formData.city}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Continuar →
              </button>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">+1.200 propietarios ya han valorado su vivienda este mes</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-yellow-400 text-2xl">★</span>
              ))}
              <span className="ml-2 text-gray-600 font-semibold">4.9/5 (834 opiniones)</span>
            </div>
          </div>
        </div>
      )}

      {/* Paso 2: Situación Urgente */}
      {step === 2 && (
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setStep(1)}
              className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-2"
            >
              ← Volver
            </button>

            <h2 className="text-3xl font-bold mb-4">¿Cuál es tu situación?</h2>
            <p className="text-gray-600 mb-8">
              Esto nos ayuda a ofrecerte la mejor solución para tu caso específico
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {URGENT_SITUATIONS.map((situation) => (
                <button
                  key={situation.value}
                  onClick={() => setFormData({ ...formData, urgentSituation: situation.value })}
                  className={`
                    p-6 border-2 rounded-xl text-left transition hover:border-blue-500
                    ${formData.urgentSituation === situation.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl mb-2 block">{situation.label.split(' ')[0]}</span>
                    {formData.urgentSituation === situation.value && (
                      <Check className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1">
                    {situation.label.substring(3)}
                  </h3>
                  <p className="text-sm text-gray-600">{situation.description}</p>
                </button>
              ))}
            </div>

            {formData.urgentSituation && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cuéntanos más detalles (opcional)
                </label>
                <textarea
                  value={formData.situationDetails}
                  onChange={(e) => setFormData({ ...formData, situationDetails: e.target.value })}
                  placeholder="Cualquier información adicional que nos ayude a entender tu situación..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              disabled={!formData.urgentSituation}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Fotos */}
      {step === 3 && (
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setStep(2)}
              className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-2"
            >
              ← Volver
            </button>

            <h2 className="text-3xl font-bold mb-4">Sube algunas fotos</h2>
            <p className="text-gray-600 mb-8">
              Esto nos permite hacer una valoración más precisa. Puedes subir hasta 5 fotos.
            </p>

            <div className="mb-8">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 cursor-pointer transition">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    <span className="text-blue-600 font-semibold">Click para subir fotos</span> o arrastra aquí
                  </p>
                  <p className="text-sm text-gray-500">
                    Máximo 5 fotos • JPG, PNG • Max 10MB cada una
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  max={5}
                />
              </label>

              {formData.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-5 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          const newPhotos = [...formData.photos];
                          newPhotos.splice(index, 1);
                          setFormData({ ...formData, photos: newPhotos });
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
              >
                Omitir fotos
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={formData.photos.length === 0}
                className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Continuar con fotos →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 4: Datos de contacto */}
      {step === 4 && (
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setStep(3)}
              className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-2"
            >
              ← Volver
            </button>

            <div className="mb-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">¡Último paso!</h2>
              <p className="text-gray-600">
                Deja tus datos para recibir la valoración de tu vivienda por WhatsApp
              </p>
            </div>

            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  WhatsApp / Teléfono *
                </label>
                <input
                  type="tel"
                  placeholder="+34 600 123 456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Te enviaremos la valoración por WhatsApp en menos de 1 minuto
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
                <p className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Tus datos están protegidos. Solo los usaremos para enviarte la valoración y contactarte si es necesario. Nunca los compartiremos con terceros sin tu permiso.
                  </span>
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.phone || loading}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generando valoración...
                  </>
                ) : (
                  <>Ver mi valoración gratis →</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
