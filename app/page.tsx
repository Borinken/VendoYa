import Link from 'next/link'
import { Building2, Users, FileText, Home, Calendar, Bell, Search, Shield, BarChart3, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Building2,
      title: 'Gestión de Propiedades',
      description: 'Administra tu inventario completo de propiedades en venta y alquiler con fotos, características y seguimiento de estado.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Users,
      title: 'CRM de Contactos',
      description: 'Gestiona leads, compradores, vendedores e inquilinos. Seguimiento completo del ciclo de vida del cliente.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: FileText,
      title: 'Contratos y Alquileres',
      description: 'Control total de contratos de compraventa y alquiler con gestión de pagos y vencimientos.',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      icon: Calendar,
      title: 'Actividades y Tareas',
      description: 'Planifica visitas, llamadas y seguimientos. No pierdas ninguna oportunidad de negocio.',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: Search,
      title: 'Captación Automática',
      description: 'Sistema inteligente que busca propiedades en portales inmobiliarios según tus filtros personalizados.',
      color: 'from-indigo-500 to-blue-500'
    },
    {
      icon: Bell,
      title: 'Gestión de Incidencias',
      description: 'Registro y seguimiento de problemas en propiedades alquiladas con sistema de notificaciones.',
      color: 'from-rose-500 to-red-500'
    },
    {
      icon: BarChart3,
      title: 'Dashboard Analítico',
      description: 'Visualiza métricas clave, ingresos mensuales y rendimiento de tu agencia en tiempo real.',
      color: 'from-violet-500 to-purple-500'
    },
    {
      icon: Shield,
      title: 'RGPD Compliant',
      description: 'Cumplimiento total con RGPD. Gestión de consentimientos y protección de datos personales.',
      color: 'from-slate-500 to-gray-500'
    }
  ]

  const benefits = [
    'Aumenta un 40% tu productividad',
    'Reduce errores en contratos',
    'Centraliza toda tu información',
    'Acceso desde cualquier dispositivo'
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
              <Home className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Vendoya CRM</h1>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
          >
            Acceder al Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">CRM Inmobiliario de Nueva Generación</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Potencia tu agencia<br />
            <span className="text-emerald-600">inmobiliaria con IA</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            La plataforma todo-en-uno que revoluciona la gestión inmobiliaria. 
            Automatiza tareas, aumenta ventas y ofrece experiencias excepcionales a tus clientes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/dashboard"
              className="group px-8 py-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-lg flex items-center space-x-2"
            >
              <span>Explorar Dashboard</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 font-semibold text-lg shadow-sm"
            >
              Ver Características
            </a>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2 bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access Info - moved higher */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🔑 Acceso Inmediato al Sistema</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-700"><span className="font-semibold text-gray-900">Usuario Demo:</span> admin@vendoya.es</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span className="text-gray-700"><span className="font-semibold text-gray-900">Estado:</span> Acceso directo sin login</span>
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-sm text-gray-700">
                    <span className="text-amber-700 font-semibold">⚠️ Importante:</span> Ejecuta el schema SQL en Supabase para crear las tablas y datos de ejemplo.
                  </p>
                  <code className="text-xs text-emerald-700 mt-2 block font-mono">supabase-schema.sql</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 bg-gray-50">
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-emerald-200 rounded-full mb-6">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Funcionalidades Avanzadas</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Todo lo que necesitas para<br />
            <span className="text-emerald-600">gestionar tu inmobiliaria</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Funcionalidades completas diseñadas específicamente para agencias inmobiliarias españolas
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="border-y border-gray-200 bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tecnología Moderna y Escalable
            </h2>
            <p className="text-lg text-gray-600">
              Construido con las mejores herramientas del mercado
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 text-center hover:border-blue-400 hover:shadow-lg transition-all duration-300">
              <div className="text-5xl mb-4">⚛️</div>
              <h3 className="font-bold text-gray-900 text-xl mb-3">Next.js 14</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Framework React con App Router y Server Components</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 text-center hover:border-emerald-400 hover:shadow-lg transition-all duration-300">
              <div className="text-5xl mb-4">🗄️</div>
              <h3 className="font-bold text-gray-900 text-xl mb-3">Supabase</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Base de datos PostgreSQL con autenticación integrada</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 text-center hover:border-cyan-400 hover:shadow-lg transition-all duration-300">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="font-bold text-gray-900 text-xl mb-3">Tailwind CSS</h3>
              <p className="text-sm text-gray-600 leading-relaxed">Diseño moderno y responsive con utility-first CSS</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="relative overflow-hidden bg-emerald-500 rounded-3xl p-12 md:p-16 text-center shadow-xl">
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              ¿Listo para transformar tu agencia?
            </h2>
            <p className="text-xl mb-10 text-emerald-50 max-w-2xl mx-auto">
              Accede al dashboard y comienza a gestionar tu negocio inmobiliario de forma profesional
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 px-10 py-5 bg-white text-emerald-600 rounded-lg hover:bg-gray-50 transition-all duration-300 font-bold shadow-lg text-lg"
            >
              <span>Ir al Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Vendoya CRM</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-600">© 2026 Vendoya CRM. Desarrollado con Next.js, Supabase y Tailwind CSS.</p>
              <p className="mt-2 text-sm text-gray-500">
                Desplegado en <a href="https://vercel.com" className="text-emerald-500 hover:text-emerald-600 transition-colors">Vercel</a> - 
                Dominio: <a href="https://vendoya.es" className="text-emerald-500 hover:text-emerald-600 transition-colors">vendoya.es</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
