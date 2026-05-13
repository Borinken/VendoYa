'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Building2, Users, Settings, Menu, X, BarChart3, Bell, FolderOpen, Mail, TrendingUp, Box, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: '🎯 Captar Propietarios', href: '/dashboard/captar-propietarios', icon: TrendingUp },
  { name: '💰 Inversores', href: '/dashboard/investors', icon: BarChart3 },
  { name: 'Contactos', href: '/dashboard/contacts', icon: Users },
  { name: 'Propiedades', href: '/dashboard/properties', icon: Building2 },
  { name: '🎬 Tours 3D', href: '/dashboard/tours-3d', icon: Box },
  { name: 'Documentos', href: '/dashboard/documents', icon: FolderOpen },
  { name: '📧 Configurar Email', href: '/dashboard/email-config', icon: Mail },
  { name: 'Configuración', href: '/dashboard/config', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-white border border-gray-300 shadow-md"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white transition-transform duration-300 ease-in-out border-r border-gray-200',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-center border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Vendoya CRM</h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-3 pb-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <button className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50 rounded-lg transition-colors text-sm border border-gray-200 shadow-sm">
                <span className="text-gray-700">Notificaciones</span>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <Bell className="w-4 h-4 text-gray-600" />
                </div>
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500">
                <span className="text-base font-bold text-white">
                  {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.user_metadata?.first_name || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email || 'admin@vendoya.es'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 rounded-lg transition-colors text-sm border border-gray-200 shadow-sm text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
