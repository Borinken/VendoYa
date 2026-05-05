'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Building2, Trash2, MapPin, Euro, Layers, 
  ExternalLink, CheckCircle2, Clock, Plus, Eye, Power,
  Shield, Filter, Home, TrendingUp, X, Save, RefreshCw
} from 'lucide-react'

// ============================================
// INTERFACES
// ============================================

interface PlatformCredentials {
  platform: 'idealista' | 'fotocasa' | 'realadvisor'
  username: string
  password: string
  connected: boolean
  lastCheck?: string
}

interface SearchFilter {
  id?: string
  name: string
  platform: 'idealista' | 'fotocasa' | 'realadvisor'
  city: string
  operation: 'sale' | 'rent'
  propertyType: string
  minPrice?: number
  maxPrice?: number
  minRooms?: number
  minSurface?: number
  isActive: boolean
  propertiesFound?: number
  lastRun?: string
}

interface Property {
  id: string
  source: string
  source_id: string
  source_url: string
  data: {
    title?: string
    price?: number
    city?: string
    surface?: number
    rooms?: number
    bathrooms?: number
    description?: string
    images?: string[]
    address?: string
    propertyType?: string
  }
  status: 'new' | 'viewed' | 'interested' | 'contacted' | 'imported' | 'discarded'
  created_at: string
}

// ============================================
// PLATFORM CONFIGURATION
// ============================================

const PLATFORMS = [
  {
    id: 'idealista' as const,
    name: 'Idealista',
    logo: '/idealista-logo.png', // Añadir logos después
    color: 'bg-yellow-500',
    placeholder: {
      username: 'tu-email@ejemplo.com',
      password: '••••••••'
    }
  },
  {
    id: 'fotocasa' as const,
    name: 'Fotocasa',
    logo: '/fotocasa-logo.png',
    color: 'bg-blue-500',
    placeholder: {
      username: 'tu-email@ejemplo.com',
      password: '••••••••'
    }
  },
  {
    id: 'realadvisor' as const,
    name: 'RealAdvisor',
    logo: '/realadvisor-logo.png',
    color: 'bg-emerald-500',
    placeholder: {
      username: 'tu-email@ejemplo.com',
      password: '••••••••'
    }
  }
]

const PROPERTY_TYPES = ['Piso', 'Casa', 'Chalet', 'Ático', 'Dúplex', 'Estudio']
const OPERATION_TYPES = [
  { id: 'sale', name: 'Venta' },
  { id: 'rent', name: 'Alquiler' }
]

// ============================================
// MAIN COMPONENT
// ============================================

export default function PropertiesPage() {
  // Estados
  const [currentStep, setCurrentStep] = useState<'credentials' | 'filters' | 'properties'>('credentials')
  const [credentials, setCredentials] = useState<PlatformCredentials[]>([])
  const [filters, setFilters] = useState<SearchFilter[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilterForm, setShowFilterForm] = useState(false)
  const [editingFilter, setEditingFilter] = useState<SearchFilter | null>(null)
  
  // Form states
  const [filterForm, setFilterForm] = useState<SearchFilter>({
    name: '',
    platform: 'idealista',
    city: '',
    operation: 'sale',
    propertyType: 'Piso',
    isActive: true
  })

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select first connected platform when showing filter form
  useEffect(() => {
    if (showFilterForm) {
      const connectedPlatformsList = credentials.filter(c => c.connected).map(c => c.platform)
      // If current platform is not connected, select the first connected one
      if (connectedPlatformsList.length > 0 && !connectedPlatformsList.includes(filterForm.platform)) {
        setFilterForm(prev => ({ ...prev, platform: connectedPlatformsList[0] }))
      }
    }
  }, [showFilterForm, credentials, filterForm.platform])

  const loadData = async () => {
    await Promise.all([
      loadCredentials(),
      loadFilters(),
      loadProperties()
    ])
  }

  // ============================================
  // CREDENTIALS FUNCTIONS
  // ============================================

  const loadCredentials = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', [
          'idealista_username', 'idealista_password',
          'fotocasa_username', 'fotocasa_password',
          'realadvisor_username', 'realadvisor_password'
        ])

      if (error) throw error

      const creds: PlatformCredentials[] = PLATFORMS.map(platform => {
        const username = data?.find(d => d.config_key === `${platform.id}_username`)?.config_value
        const password = data?.find(d => d.config_key === `${platform.id}_password`)?.config_value
        
        return {
          platform: platform.id,
          username: username || '',
          password: password || '',
          connected: !!(username && password)
        }
      })

      setCredentials(creds)
    } catch (error) {
      console.error('Error loading credentials:', error)
    }
  }

  const saveCredential = async (platform: string, username: string, password: string) => {
    setLoading(true)
    try {
      // Validación básica
      if (!username || !password) {
        alert('⚠️ Por favor, completa todos los campos')
        setLoading(false)
        return
      }

      // Validar formato de email si es username
      if (username && !username.includes('@')) {
        const confirm = window.confirm('⚠️ El usuario no parece ser un email válido. ¿Deseas continuar de todas formas?')
        if (!confirm) {
          setLoading(false)
          return
        }
      }

      const credentialsToSave = {
        [`${platform}_username`]: username,
        [`${platform}_password`]: password
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialsToSave)
      })

      if (!response.ok) {
        throw new Error('Error al guardar credenciales')
      }

      // Actualizar estado local
      setCredentials(prev => prev.map(cred => 
        cred.platform === platform 
          ? { ...cred, username, password, connected: true, lastCheck: new Date().toISOString() }
          : cred
      ))

      alert(`✅ ${PLATFORMS.find(p => p.id === platform)?.name} conectado correctamente`)
    } catch (error) {
      console.error('Error saving credential:', error)
      alert('❌ Error al conectar. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FILTERS FUNCTIONS
  // ============================================

  const loadFilters = async () => {
    try {
      const { data, error } = await supabase
        .from('capture_filters')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setFilters((data || []).map(f => ({
        id: f.id,
        name: f.name,
        platform: f.source,
        city: f.city,
        operation: f.operation_type,
        propertyType: f.property_type,
        minPrice: f.min_price,
        maxPrice: f.max_price,
        minRooms: f.min_rooms,
        minSurface: f.min_surface,
        isActive: f.is_active,
        propertiesFound: f.properties_found,
        lastRun: f.last_run
      })))
    } catch (error) {
      console.error('Error loading filters:', error)
    }
  }

  const saveFilter = async () => {
    setLoading(true)
    try {
      // Validar campos requeridos
      if (!filterForm.name || !filterForm.city) {
        alert('⚠️ Por favor completa los campos: Nombre y Ciudad')
        setLoading(false)
        return
      }

      const filterData = {
        name: filterForm.name,
        source: filterForm.platform,
        operation_type: filterForm.operation,
        property_type: filterForm.propertyType,
        city: filterForm.city,
        min_price: filterForm.minPrice || null,
        max_price: filterForm.maxPrice || null,
        min_rooms: filterForm.minRooms || null,
        min_surface: filterForm.minSurface || null,
        is_active: filterForm.isActive,
        notify_whatsapp: false,
        filters: {
          city: filterForm.city,
          operation: filterForm.operation,
          propertyType: filterForm.propertyType,
          minPrice: filterForm.minPrice,
          maxPrice: filterForm.maxPrice,
          minRooms: filterForm.minRooms,
          minSurface: filterForm.minSurface
        }
      }

      if (editingFilter?.id) {
        const { error } = await supabase
          .from('capture_filters')
          .update(filterData)
          .eq('id', editingFilter.id)
        if (error) {
          console.error('Error updating filter:', error)
          throw new Error(`Error al actualizar: ${error.message || JSON.stringify(error)}`)
        }
      } else {
        const { error } = await supabase
          .from('capture_filters')
          .insert([filterData])
        if (error) {
          console.error('Error inserting filter:', error)
          throw new Error(`Error al insertar: ${error.message || JSON.stringify(error)}`)
        }
      }

      alert('✅ Filtro guardado correctamente')
      await loadFilters()
      resetFilterForm()
    } catch (error) {
      console.error('Error saving filter:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert(`❌ Error al guardar filtro:\n${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const toggleFilterActive = async (filterId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('capture_filters')
        .update({ is_active: !isActive })
        .eq('id', filterId)

      if (error) throw error
      await loadFilters()
    } catch (error) {
      console.error('Error toggling filter:', error)
    }
  }

  const deleteFilter = async (filterId: string) => {
    if (!confirm('¿Eliminar este filtro?')) return
    
    try {
      const { error } = await supabase
        .from('capture_filters')
        .delete()
        .eq('id', filterId)

      if (error) throw error
      await loadFilters()
    } catch (error) {
      console.error('Error deleting filter:', error)
    }
  }

  const resetFilterForm = () => {
    setFilterForm({
      name: '',
      platform: 'idealista',
      city: '',
      operation: 'sale',
      propertyType: 'Piso',
      isActive: true
    })
    setEditingFilter(null)
    setShowFilterForm(false)
  }

  // ============================================
  // PROPERTIES FUNCTIONS
  // ============================================

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('captured_properties')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const updatePropertyStatus = async (propertyId: string, status: Property['status']) => {
    try {
      const { error } = await supabase
        .from('captured_properties')
        .update({ status })
        .eq('id', propertyId)

      if (error) throw error
      await loadProperties()
    } catch (error) {
      console.error('Error updating property:', error)
    }
  }

  const deleteProperty = async (propertyId: string) => {
    if (!confirm('¿Eliminar esta propiedad?')) return
    
    try {
      const { error } = await supabase
        .from('captured_properties')
        .delete()
        .eq('id', propertyId)

      if (error) throw error
      await loadProperties()
    } catch (error) {
      console.error('Error deleting property:', error)
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(price)
  }

  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find(p => p.id === platform) || PLATFORMS[0]
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const connectedPlatforms = credentials.filter(c => c.connected).length
  const activeFilters = filters.filter(f => f.isActive).length
  const totalProperties = properties.length

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏠 Gestor de Propiedades
          </h1>
          <p className="text-gray-600">
            Conecta tus cuentas, configura filtros y encuentra propiedades automáticamente
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <StepIndicator 
              number={1} 
              title="Conectar Cuentas" 
              active={currentStep === 'credentials'}
              completed={connectedPlatforms > 0}
              onClick={() => setCurrentStep('credentials')}
            />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full transition-all ${connectedPlatforms > 0 ? 'bg-emerald-500 w-full' : 'w-0'}`} />
            </div>
            <StepIndicator 
              number={2} 
              title="Configurar Filtros" 
              active={currentStep === 'filters'}
              completed={activeFilters > 0}
              onClick={() => setCurrentStep('filters')}
            />
            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div className={`h-full transition-all ${activeFilters > 0 ? 'bg-emerald-500 w-full' : 'w-0'}`} />
            </div>
            <StepIndicator 
              number={3} 
              title="Ver Propiedades" 
              active={currentStep === 'properties'}
              completed={totalProperties > 0}
              onClick={() => setCurrentStep('properties')}
            />
          </div>
        </div>

        {/* Step 1: Credentials */}
        {currentStep === 'credentials' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">1. Conecta tus Cuentas</h2>
              <p className="text-gray-600 text-sm">
                Conecta al menos 1 plataforma para continuar. No es necesario conectar todas.
              </p>
            </div>

            {/* Advertencia de seguridad */}
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-amber-900 font-bold mb-1">⚠️ Usa solo credenciales reales</h3>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    Debes usar las credenciales <strong>reales</strong> de tus cuentas de Idealista, Fotocasa o RealAdvisor. 
                    Todas las credenciales se guardan <strong>encriptadas con AES-256</strong> para máxima seguridad. 
                    No uses credenciales de prueba como &ldquo;admin&rdquo; - el sistema solo funciona con cuentas reales verificadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 font-medium">
                {connectedPlatforms} de {PLATFORMS.length} plataformas conectadas
              </div>
            </div>
            
            {PLATFORMS.map(platform => {
              const cred = credentials.find(c => c.platform === platform.id)
              return (
                <CredentialCard
                  key={platform.id}
                  platform={platform}
                  credential={cred}
                  onSave={saveCredential}
                  loading={loading}
                />
              )
            })}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCurrentStep('filters')}
                disabled={connectedPlatforms === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Siguiente: Configurar Filtros →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Filters */}
        {currentStep === 'filters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">2. Filtros de Búsqueda</h2>
              <button
                onClick={() => setShowFilterForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-5 h-5" />
                Nuevo Filtro
              </button>
            </div>

            {showFilterForm && (
              <FilterForm
                form={filterForm}
                onChange={setFilterForm}
                onSave={saveFilter}
                onCancel={resetFilterForm}
                loading={loading}
                connectedPlatforms={credentials.filter(c => c.connected).map(c => c.platform)}
              />
            )}

            {filters.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay filtros configurados
                </h3>
                <p className="text-gray-600 mb-6">
                  Crea tu primer filtro para empezar a buscar propiedades automáticamente
                </p>
                <button
                  onClick={() => setShowFilterForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  <Plus className="w-5 h-5" />
                  Crear Primer Filtro
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filters.map(filter => (
                  <FilterCard
                    key={filter.id}
                    filter={filter}
                    onToggle={() => filter.id && toggleFilterActive(filter.id, filter.isActive)}
                    onEdit={() => {
                      setFilterForm(filter)
                      setEditingFilter(filter)
                      setShowFilterForm(true)
                    }}
                    onDelete={() => filter.id && deleteFilter(filter.id)}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep('credentials')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                ← Volver
              </button>
              <button
                onClick={() => setCurrentStep('properties')}
                disabled={activeFilters === 0}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Ver Propiedades →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Properties */}
        {currentStep === 'properties' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">3. Propiedades Encontradas</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  {totalProperties} propiedades
                </div>
                <button
                  onClick={loadProperties}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
              </div>
            </div>

            {properties.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay propiedades todavía
                </h3>
                <p className="text-gray-600 mb-6">
                  Las propiedades aparecerán automáticamente según tus filtros activos.<br />
                  El sistema busca nuevas propiedades cada 5 minutos.
                </p>
                <button
                  onClick={() => setCurrentStep('filters')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                >
                  Configurar Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map(property => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onUpdateStatus={updatePropertyStatus}
                    onDelete={deleteProperty}
                    formatPrice={formatPrice}
                    formatDate={formatDate}
                    getPlatformInfo={getPlatformInfo}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-start mt-6">
              <button
                onClick={() => setCurrentStep('filters')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                ← Volver a Filtros
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StepIndicator({ 
  number, 
  title, 
  active, 
  completed, 
  onClick 
}: { 
  number: number
  title: string
  active: boolean
  completed: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 transition ${active ? 'scale-110' : 'scale-100'}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg transition ${
        completed ? 'bg-emerald-500' : active ? 'bg-blue-500' : 'bg-gray-300'
      }`}>
        {completed ? <CheckCircle2 className="w-6 h-6" /> : number}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-gray-900' : 'text-gray-500'}`}>
        {title}
      </span>
    </button>
  )
}

function CredentialCard({ 
  platform, 
  credential, 
  onSave, 
  loading 
}: {
  platform: typeof PLATFORMS[0]
  credential?: PlatformCredentials
  onSave: (platform: string, username: string, password: string) => void
  loading: boolean
}) {
  const [username, setUsername] = useState(credential?.username || '')
  const [password, setPassword] = useState(credential?.password || '')
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-gray-100">
      <div className="flex items-start gap-4">
        {/* Logo Placeholder */}
        <div className={`w-16 h-16 rounded-lg ${platform.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
          {platform.name[0]}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-bold text-gray-900">{platform.name}</h3>
            {credential?.connected && (
              <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Conectado
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario / Email
              </label>
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform.placeholder.username}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={platform.placeholder.password}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-500 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <Eye className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => onSave(platform.id, username, password)}
              disabled={!username || !password || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              <Shield className="w-4 h-4" />
              {credential?.connected ? 'Actualizar Conexión' : 'Conectar Cuenta'}
            </button>
          </div>

          {credential?.lastCheck && (
            <div className="mt-3 text-xs text-gray-500">
              Última verificación: {formatDate(credential.lastCheck)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterForm({
  form,
  onChange,
  onSave,
  onCancel,
  loading,
  connectedPlatforms
}: {
  form: SearchFilter
  onChange: (form: SearchFilter) => void
  onSave: () => void
  onCancel: () => void
  loading: boolean
  connectedPlatforms: string[]
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-emerald-500">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {form.id ? 'Editar Filtro' : 'Nuevo Filtro de Búsqueda'}
        </h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Filtro
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej: Pisos Barcelona Centro"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plataforma
          </label>
          <select
            value={form.platform}
            onChange={(e) => onChange({ ...form, platform: e.target.value as 'idealista' | 'fotocasa' | 'realadvisor' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {PLATFORMS.filter(p => connectedPlatforms.includes(p.id)).map(platform => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
            placeholder="Barcelona, Madrid, Valencia..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operación
          </label>
          <select
            value={form.operation}
            onChange={(e) => onChange({ ...form, operation: e.target.value as 'sale' | 'rent' })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {OPERATION_TYPES.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Propiedad
          </label>
          <select
            value={form.propertyType}
            onChange={(e) => onChange({ ...form, propertyType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            {PROPERTY_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio Mínimo (€)
          </label>
          <input
            type="number"
            value={form.minPrice || ''}
            onChange={(e) => onChange({ ...form, minPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="50000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio Máximo (€)
          </label>
          <input
            type="number"
            value={form.maxPrice || ''}
            onChange={(e) => onChange({ ...form, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="300000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Habitaciones Mínimas
          </label>
          <input
            type="number"
            value={form.minRooms || ''}
            onChange={(e) => onChange({ ...form, minRooms: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="2"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Superficie Mínima (m²)
          </label>
          <input
            type="number"
            value={form.minSurface || ''}
            onChange={(e) => onChange({ ...form, minSurface: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="60"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-500 text-gray-900"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
              className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Activar búsqueda automática (cada 5 minutos)
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={!form.name || !form.city || loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          <Save className="w-4 h-4" />
          Guardar Filtro
        </button>
      </div>
    </div>
  )
}

function FilterCard({ 
  filter, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  filter: SearchFilter
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const platform = PLATFORMS.find(p => p.id === filter.platform)
  
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 border-2 ${filter.isActive ? 'border-emerald-500' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded ${platform?.color} flex items-center justify-center text-white font-bold text-sm`}>
            {platform?.name[0]}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{filter.name}</h4>
            <p className="text-sm text-gray-500">{platform?.name}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition ${
            filter.isActive 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Power className="w-3 h-3" />
          {filter.isActive ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          {filter.city} • {OPERATION_TYPES.find(o => o.id === filter.operation)?.name}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Home className="w-4 h-4" />
          {filter.propertyType}
          {filter.minRooms && ` • ${filter.minRooms}+ hab`}
          {filter.minSurface && ` • ${filter.minSurface}+ m²`}
        </div>
        {(filter.minPrice || filter.maxPrice) && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Euro className="w-4 h-4" />
            {filter.minPrice && `${formatPrice(filter.minPrice)}`}
            {filter.minPrice && filter.maxPrice && ' - '}
            {filter.maxPrice && `${formatPrice(filter.maxPrice)}`}
          </div>
        )}
      </div>

      {filter.propertiesFound !== undefined && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 rounded-lg">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-900 font-medium">
            {filter.propertiesFound} propiedades encontradas
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Editar
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function PropertyCard({ 
  property, 
  onUpdateStatus, 
  onDelete,
  formatPrice,
  formatDate,
  getPlatformInfo
}: { 
  property: Property
  onUpdateStatus: (id: string, status: Property['status']) => void
  onDelete: (id: string) => void
  formatPrice: (price?: number) => string
  formatDate: (date: string) => string
  getPlatformInfo: (platform: string) => typeof PLATFORMS[0]
}) {
  const platform = getPlatformInfo(property.source)
  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    viewed: 'bg-gray-100 text-gray-700',
    interested: 'bg-yellow-100 text-yellow-700',
    contacted: 'bg-purple-100 text-purple-700',
    imported: 'bg-emerald-100 text-emerald-700',
    discarded: 'bg-red-100 text-red-700'
  }

  const statusLabels = {
    new: 'Nueva',
    viewed: 'Vista',
    interested: 'Interesante',
    contacted: 'Contactada',
    imported: 'Importada',
    discarded: 'Descartada'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition">
      {/* Image placeholder */}
      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${platform.color} text-white`}>
            {platform.name}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[property.status]}`}>
            {statusLabels[property.status]}
          </span>
        </div>
        {property.data.images && property.data.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={property.data.images[0]} 
            alt={property.data.title || 'Property image'}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {property.data.title || 'Sin título'}
        </h3>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            {property.data.city || 'N/A'}
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <Euro className="w-4 h-4" />
            {formatPrice(property.data.price)}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {property.data.rooms && (
              <span className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                {property.data.rooms} hab
              </span>
            )}
            {property.data.surface && (
              <span className="flex items-center gap-1">
                <Layers className="w-4 h-4" />
                {property.data.surface} m²
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Clock className="w-3 h-3" />
          {formatDate(property.created_at)}
        </div>

        <div className="flex gap-2">
          <a
            href={property.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Anuncio
          </a>
          <button
            onClick={() => onDelete(property.id)}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <select
          value={property.status}
          onChange={(e) => onUpdateStatus(property.id, e.target.value as Property['status'])}
          className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
        >
          <option value="new">Nueva</option>
          <option value="viewed">Vista</option>
          <option value="interested">Interesante</option>
          <option value="contacted">Contactada</option>
          <option value="imported">Importada</option>
          <option value="discarded">Descartada</option>
        </select>
      </div>
    </div>
  )
}

function formatPrice(price?: number) {
  if (!price) return 'N/A'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(price)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}