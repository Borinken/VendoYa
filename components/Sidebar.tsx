'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Building2, Users, Settings, Menu, X, Bell, FolderOpen, Mail, TrendingUp, Box, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Propiedades', href: '/dashboard/properties', icon: Building2 },
  { name: 'Contactos', href: '/dashboard/contacts', icon: Users },
  { name: 'Documentos', href: '/dashboard/documents', icon: FolderOpen },
  { name: 'Email', href: '/dashboard/email-config', icon: Mail },
  { name: 'Tours 3D', href: '/dashboard/tours-3d', icon: Box },
  { name: 'Configuración', href: '/dashboard/config', icon: Settings },
  { name: 'Análisis', href: '/dashboard/investors', icon: TrendingUp },
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
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-2xl bg-[#171717] border border-[#262626] shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-[#FAFAFA]" />
        ) : (
          <Menu className="h-6 w-6 text-[#FAFAFA]" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] transition-transform duration-300 ease-in-out border-r border-[#262626]',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-center border-b border-[#262626]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D4A574] to-[#E5C28C] rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(212,165,116,0.25)]">
                <Home className="w-6 h-6 text-black" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#A1865A]">Vendoya.es</p>
                <h1 className="text-xl font-bold text-[#FAFAFA]">Agente Vendoya</h1>
              </div>
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
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#D4A574] text-black'
                      : 'text-[#E5E7EB] hover:bg-[#171717] hover:text-white'
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
            <div className="bg-[#171717] rounded-3xl p-4 border border-[#262626]">
              <button className="w-full flex items-center justify-between px-3 py-2 bg-[#0F0F0F] hover:bg-[#171717] rounded-2xl transition-colors text-sm border border-[#262626] shadow-sm text-[#E5E7EB]">
                <span>Notificaciones</span>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-[#D4A574] rounded-full animate-pulse"></span>
                  <Bell className="w-4 h-4 text-[#D4A574]" />
                </div>
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="border-t border-[#262626] p-4 bg-[#0F0F0F]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A574] text-black">
                <span className="text-base font-bold">
                  {user?.email?.substring(0, 2).toUpperCase() || 'AD'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FAFAFA] truncate">
                  {user?.user_metadata?.first_name || 'Usuario'}
                </p>
                <p className="text-xs text-[#A1A1A8] truncate">{user?.email || 'admin@vendoya.es'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#171717] hover:bg-[#1F1F1F] rounded-2xl transition-colors text-sm border border-[#262626] shadow-sm text-[#E5E7EB]"
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
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
