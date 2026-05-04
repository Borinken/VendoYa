'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Users, FileText, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  totalProperties: number
  availableProperties: number
  totalContacts: number
  monthlyRevenue: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    availableProperties: 0,
    totalContacts: 0,
    monthlyRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
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

      setStats({
        totalProperties: totalProps || 0,
        availableProperties: availableProps || 0,
        totalContacts: totalContactsCount || 0,
        monthlyRevenue: 0, // TODO: Calculate from contracts
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Propiedades Totales',
      value: stats.totalProperties,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      name: 'Disponibles',
      value: stats.availableProperties,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: 'Contactos',
      value: stats.totalContacts,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Ingresos del Mes',
      value: formatCurrency(stats.monthlyRevenue),
      icon: FileText,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Bienvenido a tu CRM Inmobiliario
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-lg bg-white p-6 shadow animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.name}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} rounded-lg p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Acciones Rápidas
          </h2>
          <div className="space-y-3">
            <a
              href="/dashboard/properties"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  Añadir Propiedad
                </span>
                <Building2 className="h-5 w-5 text-gray-400" />
              </div>
            </a>
            <a
              href="/dashboard/contacts"
              className="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  Añadir Contacto
                </span>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </a>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Actividad Reciente
          </h2>
          <div className="text-sm text-gray-600">
            <p>No hay actividad reciente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
