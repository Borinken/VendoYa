import Link from 'next/link'
import { Building2, Users, FileText, TrendingUp, Home, Calendar, Bell, Search, Shield, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Building2,
      title: 'Gestión de Propiedades',
      description: 'Administra tu inventario completo de propiedades en venta y alquiler con fotos, características y seguimiento de estado.'
    },
    {
      icon: Users,
      title: 'CRM de Contactos',
      description: 'Gestiona leads, compradores, vendedores e inquilinos. Seguimiento completo del ciclo de vida del cliente.'
    },
    {
      icon: FileText,
      title: 'Contratos y Alquileres',
      description: 'Control total de contratos de compraventa y alquiler con gestión de pagos y vencimientos.'
    },
    {
      icon: Calendar,
      title: 'Actividades y Tareas',
      description: 'Planifica visitas, llamadas y seguimientos. No pierdas ninguna oportunidad de negocio.'
    },
    {
      icon: Search,
      title: 'Captación Automática',
      description: 'Sistema inteligente que busca propiedades en portales inmobiliarios según tus filtros personalizados.'
    },
    {
      icon: Bell,
      title: 'Gestión de Incidencias',
      description: 'Registro y seguimiento de problemas en propiedades alquiladas con sistema de notificaciones.'
    },
    {
      icon: BarChart3,
      title: 'Dashboard Analítico',
      description: 'Visualiza métricas clave, ingresos mensuales y rendimiento de tu agencia en tiempo real.'
    },
    {
      icon: Shield,
      title: 'RGPD Compliant',
      description: 'Cumplimiento total con RGPD. Gestión de consentimientos y protección de datos personales.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Home className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Vendoya CRM</h1>
          </div>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
          >
            Acceder al Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full mb-6">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">CRM Inmobiliario Profesional</span>
        </div>
        
        <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Gestiona tu agencia<br />
          <span className="text-blue-600">desde un solo lugar</span>
        </h2>
        
        <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
          Software completo para agencias inmobiliarias. Controla propiedades, clientes, contratos y 
          genera más negocio con herramientas de captación automática.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg hover:shadow-xl text-lg"
          >
            Explorar Dashboard
          </Link>
          <a
            href="#features"
            className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors font-semibold text-lg"
          >
            Ver Características
          </a>
        </div>

        {/* Access Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🔑 Información de Acceso</h3>
          <div className="text-left space-y-2">
            <p className="text-gray-700">
              <span className="font-medium">Usuario Demo:</span> admin@vendoya.es
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Estado:</span> Sin sistema de login (acceso directo al dashboard)
            </p>
            <p className="text-sm text-gray-600 mt-3">
              ⚠️ <strong>Importante:</strong> Ejecuta el schema SQL en Supabase para crear las tablas y datos de ejemplo.
              El archivo se encuentra en <code className="bg-white px-2 py-0.5 rounded">supabase-schema.sql</code>
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Todo lo que necesitas para gestionar tu inmobiliaria
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Funcionalidades completas diseñadas específicamente para agencias inmobiliarias españolas
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-white border-t border-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tecnología Moderna y Escalable
            </h2>
            <p className="text-lg text-gray-600">
              Construido con las mejores herramientas del mercado
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-3">⚛️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Next.js 14</h3>
              <p className="text-sm text-gray-600">Framework React con App Router y Server Components</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🗄️</div>
              <h3 className="font-semibold text-gray-900 mb-2">Supabase</h3>
              <p className="text-sm text-gray-600">Base de datos PostgreSQL con autenticación integrada</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="font-semibold text-gray-900 mb-2">Tailwind CSS</h3>
              <p className="text-sm text-gray-600">Diseño moderno y responsive con utility-first CSS</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white shadow-xl">
          <h2 className="text-4xl font-bold mb-4">
            ¿Listo para transformar tu agencia?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Accede al dashboard y comienza a gestionar tu negocio inmobiliario
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold shadow-lg hover:shadow-xl text-lg"
          >
            Ir al Dashboard →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© 2026 Vendoya CRM. Desarrollado con Next.js, Supabase y Tailwind CSS.</p>
          <p className="mt-2 text-sm">
            Desplegado en <a href="https://vercel.com" className="text-blue-600 hover:underline">Vercel</a> - 
            Dominio: <a href="https://vendoya.es" className="text-blue-600 hover:underline">vendoya.es</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
