'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, TrendingUp, MapPin, ArrowUp, ArrowDown, Euro } from 'lucide-react'
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
    { month: 'Ene', visitantes: 420, reservas: 36 },
    { month: 'Feb', visitantes: 380, reservas: 42 },
    { month: 'Mar', visitantes: 450, reservas: 50 },
    { month: 'Abr', visitantes: 520, reservas: 58 },
    { month: 'May', visitantes: 610, reservas: 70 },
    { month: 'Jun', visitantes: 720, reservas: 84 },
  ]

  const propertyTypes = [
    { name: 'Pisos', value: 45, color: '#D4A574' },
    { name: 'Chalets', value: 25, color: '#E5C28C' },
    { name: 'Locales', value: 20, color: '#A1865A' },
    { name: 'Otros', value: 10, color: '#8A6A32' },
  ]

  const statCards = [
    {
      name: 'Propiedades publicadas',
      value: stats.totalProperties,
      icon: TrendingUp,
      bgColor: 'bg-[#1F1A14]',
      iconColor: 'text-[#D4A574]',
      change: '+12%',
      positive: true,
    },
    {
      name: 'Contactos interesados',
      value: stats.totalContacts,
      icon: Users,
      bgColor: 'bg-[#1F1A14]',
      iconColor: 'text-[#E5C28C]',
      change: '+18%',
      positive: true,
    },
    {
      name: 'Reservas con Stripe',
      value: formatCurrency(stats.monthlyRevenue / 20),
      icon: Euro,
      bgColor: 'bg-[#1F1A14]',
      iconColor: 'text-[#E5C28C]',
      change: '+24%',
      positive: true,
    },
    {
      name: 'Publicaciones activas',
      value: stats.availableProperties,
      icon: ArrowUp,
      bgColor: 'bg-[#1F1A14]',
      iconColor: 'text-[#D4A574]',
      change: '+10%',
      positive: true,
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[#A1865A] mb-3">Panel propietario</p>
            <h1 className="text-4xl font-bold text-white mb-3">
              Tu venta con Stripe y soporte legal en un solo panel
            </h1>
            <p className="text-[#B8B5AD] text-lg max-w-2xl">
              Controla tus publicaciones, seguimiento de interesados, reservas seguras y documentación desde una interfaz oscura y premium.
            </p>
          </div>
          <div className="rounded-3xl border border-[#262626] bg-[#171717] p-6 text-right shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <p className="text-sm uppercase tracking-[0.24em] text-[#A1865A] mb-1">Última actualización</p>
            <p className="text-2xl font-semibold text-white">Hace unos segundos</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[2rem] bg-[#171717] border border-[#262626] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-pulse"
            >
              <div className="h-4 bg-[#1F1A14] rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-[#1F1A14] rounded w-3/4"></div>
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
                className="group rounded-[2rem] bg-[#171717] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#262626] hover:border-[#D4A574] transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-3xl ${stat.bgColor} p-3 transition-transform duration-300 group-hover:scale-105`}>
                    <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm font-semibold px-2 py-1 rounded-2xl ${stat.positive ? 'bg-[#263221] text-[#A7C181]' : 'bg-[#2A1613] text-[#FECACA]'}`}>
                    {stat.positive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    <span>{stat.change}</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-[#B8B5AD] mb-2">
                  {stat.name}
                </p>
                <p className="text-3xl font-bold text-white">
                  {stat.value}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Activity Chart */}
        <div className="lg:col-span-2 rounded-[2rem] bg-[#171717] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#262626]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Visitas y reservas</h2>
              <p className="text-sm text-[#B8B5AD] mt-1">Monitoriza el interés y la conversión de tus propiedades.</p>
            </div>
            <select className="rounded-2xl border border-[#262626] bg-[#0A0A0A] px-4 py-2 text-sm text-[#FAFAFA] outline-none focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20">
              <option>Últimos 6 meses</option>
              <option>Último año</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" />
              <XAxis dataKey="month" stroke="#A1A1AA" />
              <YAxis stroke="#A1A1AA" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F0F0F',
                  border: '1px solid #262626',
                  borderRadius: '14px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                  color: '#FAFAFA',
                }}
                labelStyle={{ color: '#E5C28C' }}
              />
              <Legend wrapperStyle={{ color: '#B8B5AD' }} />
              <Line
                type="monotone"
                dataKey="visitantes"
                stroke="#D4A574"
                strokeWidth={3}
                dot={{ fill: '#D4A574', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="reservas"
                stroke="#E5C28C"
                strokeWidth={3}
                dot={{ fill: '#E5C28C', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Property Mix Chart */}
        <div className="rounded-[2rem] bg-[#171717] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#262626]">
          <h2 className="text-2xl font-bold text-white mb-6">Tipos de publicación</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={propertyTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={90}
                fill="#8884d8"
                dataKey="value"
              >
                {propertyTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F0F0F',
                  border: '1px solid #262626',
                  borderRadius: '14px',
                  color: '#FAFAFA',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[2rem] bg-[#171717] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#262626]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Propiedades publicadas</h2>
              <p className="text-sm text-[#B8B5AD] mt-1">Últimas propiedades en tu portafolio</p>
            </div>
            <a href="/dashboard/properties" className="text-sm font-semibold text-[#D4A574] hover:text-[#E5C28C] flex items-center space-x-1">
              <span>Ver todas</span>
              <ArrowUp className="w-4 h-4 rotate-90" />
            </a>
          </div>
          <div className="space-y-3">
            {recentProperties.length > 0 ? (
              recentProperties.map((property) => (
                <div key={property.id} className="flex items-center justify-between p-4 rounded-[1.75rem] bg-[#0F0F0F] border border-[#262626] hover:border-[#D4A574] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-3xl bg-[#1F1A14] flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[#D4A574]" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{property.title}</p>
                      <p className="text-sm text-[#B8B5AD] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {property.city}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white mb-1">{formatCurrency(property.price)}</p>
                    <span className="text-xs px-3 py-1 rounded-full font-semibold bg-[#262626] text-[#E5C28C] border border-[#3B3023]">
                      {property.status || 'Desconocido'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-[#8F8B82] mb-4">Aún no hay propiedades publicadas.</p>
                <a
                  href="/dashboard/properties"
                  className="inline-flex items-center px-4 py-2 rounded-full bg-[#D4A574] text-black font-semibold hover:bg-[#E5C28C] transition"
                >
                  Ver propiedades
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-[#171717] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#262626]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Contactos interesados</h2>
              <p className="text-sm text-[#B8B5AD] mt-1">Últimos leads y mensajes recibidos</p>
            </div>
            <a href="/dashboard/contacts" className="text-sm font-semibold text-[#D4A574] hover:text-[#E5C28C] flex items-center space-x-1">
              <span>Ver todos</span>
              <ArrowUp className="w-4 h-4 rotate-90" />
            </a>
          </div>
          <div className="space-y-3">
            {recentContacts.length > 0 ? (
              recentContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 rounded-[1.75rem] bg-[#0F0F0F] border border-[#262626] hover:border-[#D4A574] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-3xl bg-[#1F1A14] flex items-center justify-center">
                      <span className="text-[#E5C28C] font-semibold text-base">
                        {contact.first_name[0]}{contact.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-[#B8B5AD] mt-1">{contact.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    contact.lead_status === 'hot'
                      ? 'bg-[#581c1c] text-[#fcd34d] border border-[#7c2d12]'
                      : contact.lead_status === 'warm'
                      ? 'bg-[#4b2e0f] text-[#facc15] border border-[#92400e]'
                      : 'bg-[#111827] text-[#93c5fd] border border-[#1e293b]'
                  }`}>
                    {contact.lead_status || 'nuevo'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[#8F8B82] text-center py-8">Aún no hay contactos registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
