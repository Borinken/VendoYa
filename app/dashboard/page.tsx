'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Users, TrendingUp, MapPin, ArrowUp, ArrowDown, Euro } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  totalProperties: number
  availableProperties: number
  totalContacts: number
  monthlyRevenue: number
}

interface Property {
  id: string
  title: string
  price: number
  city: string
  status: string
  created_at: string
}

interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string
  lead_status: string
  created_at: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    availableProperties: 0,
    totalContacts: 0,
    monthlyRevenue: 0,
  })
  const [recentProperties, setRecentProperties] = useState<Property[]>([])
  const [recentContacts, setRecentContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Count properties
      const { count: totalProps } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })

      const { count: availableProps } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available')

      // Count contacts
      const { count: totalContactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })

      // Get recent properties
      const { data: properties } = await supabase
        .from('properties')
        .select('id, title, price, city, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, lead_status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalProperties: totalProps || 0,
        availableProperties: availableProps || 0,
        totalContacts: totalContactsCount || 0,
        monthlyRevenue: 125000,
      })

      setRecentProperties(properties || [])
      setRecentContacts(contacts || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Data for charts
  const monthlyData = [
    { month: 'Ene', ventas: 45000, alquileres: 12000 },
    { month: 'Feb', ventas: 52000, alquileres: 15000 },
    { month: 'Mar', ventas: 48000, alquileres: 13500 },
    { month: 'Abr', ventas: 61000, alquileres: 16000 },
    { month: 'May', ventas: 55000, alquileres: 14500 },
    { month: 'Jun', ventas: 67000, alquileres: 18000 },
  ]

  const propertyTypes = [
    { name: 'Pisos', value: 35, color: '#3B82F6' },
    { name: 'Chalets', value: 25, color: '#8B5CF6' },
    { name: 'Locales', value: 20, color: '#10B981' },
    { name: 'Garajes', value: 20, color: '#F59E0B' },
  ]

  const statCards = [
    {
      name: 'Propiedades Totales',
      value: stats.totalProperties,
      icon: Building2,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      change: '+12%',
      positive: true,
    },
    {
      name: 'Disponibles',
      value: stats.availableProperties,
      icon: TrendingUp,
      bgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      change: '+8%',
      positive: true,
    },
    {
      name: 'Contactos',
      value: stats.totalContacts,
      icon: Users,
      bgColor: 'bg-violet-100',
      iconColor: 'text-violet-600',
      change: '+23%',
      positive: true,
    },
    {
      name: 'Ingresos del Mes',
      value: formatCurrency(stats.monthlyRevenue),
      icon: Euro,
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      change: '-5%',
      positive: false,
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Bienvenido de nuevo, aquí tienes un resumen de tu actividad
            </p>
          </div>
          <div className="text-right bg-white rounded-lg px-4 py-3 border border-gray-200">
            <p className="text-sm text-gray-500">Última actualización</p>
            <p className="text-sm font-medium text-emerald-500">Hace 2 minutos</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-gray-200 p-6 shadow-sm animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="group rounded-2xl bg-white p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-lg ${stat.bgColor} p-3 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm font-bold px-2 py-1 rounded-lg ${stat.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {stat.positive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ingresos Mensuales</h2>
              <p className="text-sm text-gray-600 mt-1">Comparativa ventas vs alquileres</p>
            </div>
            <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>Últimos 6 meses</option>
              <option>Último año</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: '#111827'
                }}
              />
              <Legend wrapperStyle={{ color: '#6B7280' }} />
              <Line 
                type="monotone" 
                dataKey="ventas" 
                stroke="#10B981" 
                strokeWidth={3} 
                dot={{ fill: '#10B981', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="alquileres" 
                stroke="#14B8A6" 
                strokeWidth={3}
                dot={{ fill: '#14B8A6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Property Types Pie Chart */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tipos de Propiedad</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={propertyTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {propertyTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  color: '#111827'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Propiedades Recientes</h2>
            <a href="/dashboard/properties" className="text-sm font-medium text-emerald-500 hover:text-emerald-600 flex items-center space-x-1">
              <span>Ver todas</span>
              <ArrowUp className="w-4 h-4 rotate-90" />
            </a>
          </div>
          <div className="space-y-3">
            {recentProperties.length > 0 ? (
              recentProperties.map((property) => (
                <div key={property.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{property.title}</p>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {property.city}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 mb-1">{formatCurrency(property.price)}</p>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      property.status === 'available' 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                        : 'bg-gray-200 text-gray-700 border border-gray-300'
                    }`}>
                      {property.status === 'available' ? 'Disponible' : property.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No hay propiedades todavía</p>
            )}
          </div>
        </div>

        {/* Recent Contacts */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Contactos Recientes</h2>
            <a href="/dashboard/contacts" className="text-sm font-medium text-emerald-500 hover:text-emerald-600 flex items-center space-x-1">
              <span>Ver todos</span>
              <ArrowUp className="w-4 h-4 rotate-90" />
            </a>
          </div>
          <div className="space-y-3">
            {recentContacts.length > 0 ? (
              recentContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                      <span className="text-cyan-600 font-bold text-base">
                        {contact.first_name[0]}{contact.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{contact.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                    contact.lead_status === 'hot' 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : contact.lead_status === 'warm'
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {contact.lead_status || 'nuevo'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No hay contactos todavía</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
