'use client'

import Link from 'next/link'
import { Home, Check, Sparkles, ArrowRight } from 'lucide-react'
import { useState } from 'react'

const plans = [
  {
    id: 'basico',
    name: 'Básico',
    price: 49,
    description: 'Para agentes individuales y equipos pequeños',
    features: [
      '500 propiedades',
      '1.000 contactos',
      '3 usuarios',
      'Análisis de inversión con IA',
      'Email automático básico (100/mes)',
      'CRM completo',
      'App móvil',
      'Soporte email',
    ],
    cta: 'Empezar 14 días gratis',
    popular: false,
  },
  {
    id: 'profesional',
    name: 'Profesional',
    price: 99,
    description: 'Para agencias en crecimiento',
    features: [
      'Propiedades ilimitadas',
      '10.000 contactos',
      '10 usuarios',
      'Email automático avanzado (1.000/mes)',
      'Automatizaciones con IA',
      'Informes personalizados',
      'Integraciones (Idealista, Fotocasa)',
      'Campos personalizados',
      'WhatsApp Business',
      'Soporte prioritario',
    ],
    cta: 'Empezar 14 días gratis',
    popular: true,
  },
  {
    id: 'empresas',
    name: 'Empresas',
    price: 199,
    description: 'Para grandes agencias y franquicias',
    features: [
      'Usuarios ilimitados',
      'Contactos ilimitados',
      'Email ilimitado',
      'API completa',
      'White-label (tu marca)',
      'Multi-oficina',
      'Roles y permisos avanzados',
      'SSO (Single Sign-On)',
      'Onboarding dedicado',
      'Account manager',
      'Soporte 24/7',
      'SLA garantizado',
    ],
    cta: 'Hablar con ventas',
    popular: false,
  },
]

const addons = [
  { name: 'Usuarios extra', price: 15, unit: 'por usuario/mes' },
  { name: 'Email extra', price: 29, unit: 'pack 1.000/mes' },
  { name: 'Scraping portales', price: 49, unit: 'por mes' },
  { name: 'Análisis IA Premium', price: 39, unit: 'por mes' },
  { name: 'WhatsApp API', price: 79, unit: 'por mes' },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const handleCheckout = async (planId: string) => {
    // Redirect to signup or checkout
    window.location.href = `/signup?plan=${planId}&billing=${billingCycle}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
              <Home className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Vendoya</h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Precios transparentes, sin sorpresas</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Planes para cada etapa<br />
            <span className="text-emerald-600">de tu agencia</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Empieza gratis durante 14 días. Sin tarjeta de crédito. Cancela cuando quieras.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Anual
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                Ahorra 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 -mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const finalPrice = billingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-xl p-8 border-2 transition-all hover:shadow-2xl ${
                    plan.popular ? 'border-emerald-500 scale-105' : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full shadow-lg">
                      Más Popular
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-gray-900">{finalPrice}€</span>
                      <span className="text-gray-600 ml-2">/mes</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-sm text-emerald-600 mt-2">
                        {finalPrice * 12}€ facturado anualmente
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all mb-6 ${
                      plan.popular
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Add-ons Opcionales</h2>
            <p className="text-xl text-gray-600">Amplía tu plan con funcionalidades extras</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons.map((addon, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-emerald-500 transition-all">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{addon.name}</h3>
                <p className="text-3xl font-bold text-emerald-600 mb-1">{addon.price}€</p>
                <p className="text-sm text-gray-600">{addon.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Preguntas Frecuentes</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: '¿Necesito tarjeta de crédito para el trial?',
                a: 'No, puedes probar Vendoya durante 14 días sin introducir ninguna tarjeta de crédito.',
              },
              {
                q: '¿Puedo cambiar de plan en cualquier momento?',
                a: 'Sí, puedes actualizar o reducir tu plan cuando quieras. Los cambios se aplicarán en tu próximo ciclo de facturación.',
              },
              {
                q: '¿Qué métodos de pago aceptan?',
                a: 'Aceptamos tarjetas de crédito/débito (Visa, Mastercard, American Express) y transferencia bancaria para pagos anuales.',
              },
              {
                q: '¿Hay compromiso de permanencia?',
                a: 'No, todos nuestros planes son sin permanencia. Puedes cancelar cuando quieras y solo pagas por el tiempo que uses.',
              },
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            ¿Listo para transformar tu agencia?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Únete a más de 150 agencias que ya usan Vendoya para vender más
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-all shadow-xl"
          >
            <span>Empezar 14 días gratis</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Vendoya. Todos los derechos reservados.
          </p>
          <div className="flex items-center justify-center space-x-6 mt-4">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacidad
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
              Términos
            </Link>
            <Link href="/legal" className="text-gray-400 hover:text-white transition-colors">
              Aviso Legal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
