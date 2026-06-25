'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Home, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#B8B5AD]">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const loginEmail = email.trim().toLowerCase() === 'admin' ? 'admin@vendoya.es' : email.trim()

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) throw error

      if (data.session) {
        router.push(redirectTo)
        router.refresh()
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#171717] border border-[#262626] rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="bg-gradient-to-br from-[#171717] to-[#0A0A0A] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#D4A574] to-[#E5C28C] flex items-center justify-center shadow-[0_0_30px_rgba(212,165,116,0.25)]">
              <Home className="w-7 h-7 text-black" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#A1865A]">Vendoya</p>
              <h1 className="text-3xl font-bold text-white">Acceso Admin</h1>
            </div>
          </div>
          <p className="text-[#B8B5AD] text-sm">Ingresa como administrador con credenciales sencillas para acceder al dashboard.</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-3xl border border-[#662C00] bg-[#2C1A09] text-[#F8D9A3]">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#F9B24F] flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#E5E1D8] mb-2">Usuario o email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8F8B82]" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#383838] bg-[#0A0A0A] text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:border-transparent transition-all"
                  placeholder="admin o admin@vendoya.es"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#E5E1D8] mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8F8B82]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-2xl border border-[#383838] bg-[#0A0A0A] text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#D4A574] focus:border-transparent transition-all"
                  placeholder="123456"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F8B82] hover:text-[#FAFAFA] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-[#B8B5AD]">
              <span>Admin: <strong className="text-[#E5C28C]">admin</strong> / <strong className="text-[#E5C28C]">123456</strong></span>
              <Link href="/forgot-password" className="text-[#D4A574] hover:text-[#E5C28C] font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-[#D4A574] text-black font-semibold hover:bg-[#E5C28C] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Entrar como Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
