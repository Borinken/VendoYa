import Link from 'next/link'
import { Home, Sparkles, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const benefits = [
    'Sin contrato exclusivo',
    'Depósito protegido',
    'Soporte notarial',
    'Venta directa en Vendoya.es'
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      <header className="border-b border-[#262626] sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-3xl bg-gradient-to-br from-[#D4A574] to-[#E5C28C] flex items-center justify-center shadow-[0_0_30px_rgba(212,165,116,0.25)]">
              <Home className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#A1865A]">vendoya.es</p>
              <h1 className="text-xl sm:text-2xl font-semibold">Tu agente personal de venta</h1>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-[#D4A574] px-5 py-3 text-sm font-semibold text-black shadow-[0_20px_60px_rgba(212,165,116,0.22)] hover:bg-[#E5C28C] transition"
          >
            Acceder al panel
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(212,165,116,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(229,194,140,0.12),_transparent_28%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#383838] bg-[#171717] px-4 py-2 text-sm text-[#E5C28C]">
                <Sparkles className="w-4 h-4" />
                Agente independiente para propietarios
              </div>
              <div className="space-y-5">
                <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                  Vende tu propiedad en <span className="bg-gradient-to-r from-[#D4A574] to-[#E5C28C] bg-clip-text text-transparent">Vendoya.es</span><br /> sin inmobiliaria ni exclusivas
                </h2>
                <p className="max-w-2xl text-lg leading-relaxed text-[#B8B5AD]">
                  La plataforma para dueños que quieren vender solos: pago seguro con Stripe, soporte notarial, registro y corrección de metros de escritura.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A574] px-8 py-4 text-base font-semibold text-black shadow-[0_24px_70px_rgba(212,165,116,0.25)] hover:bg-[#E5C28C] transition"
                >
                  Vender mi propiedad
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center rounded-full border border-[#383838] bg-[#121212] px-8 py-4 text-base font-semibold text-[#E5C28C] hover:border-[#D4A574] hover:bg-[#171717] transition"
                >
                  Cómo funciona
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="rounded-[1.75rem] border border-[#262626] bg-[#171717] px-5 py-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#8F8B82] mb-2">{benefit.split(' ')[0]}</p>
                    <p className="font-semibold text-white">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#262626] bg-[#171717] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
              <div className="mb-6 rounded-[1.8rem] bg-[#0F0F0F] p-6 border border-[#262626]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#A1865A] mb-3">Qué puedes vender</p>
                <div className="space-y-3">
                  {['Pisos', 'Chalets', 'Locales', 'Terrenos', 'Fincas', 'Naves'].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-3xl bg-[#121212] px-4 py-3 border border-[#262626]">
                      <span className="text-sm text-[#E5E2D5]">{item}</span>
                      <span className="text-xs font-semibold text-[#D4A574]">Vendoya</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.8rem] bg-[#121212] p-6 border border-[#262626]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#A1865A] mb-4">Pago seguro</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A574] text-black shadow-[0_10px_30px_rgba(212,165,116,0.22)]">
                    <span className="text-lg font-bold">$</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Stripe integrado</p>
                    <p className="text-sm text-[#B8B5AD]">Depósito digital para ofertas seguras.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.28em] text-[#A1865A] mb-4">Cómo trabaja tu agente</p>
          <h2 className="text-4xl font-bold text-white">Proceso simple para vender rápido y sin sorpresas</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#B8B5AD]">
            Con Vendoya.es recibes apoyo en cada paso: precio justo, documentación legal, publicación efectiva y cierre con Stripe.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-[#262626] bg-[#171717] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.3)]">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#D4A574] text-black">
              1
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Publica en Vendoya.es</h3>
            <p className="text-sm text-[#B8B5AD] leading-relaxed">Tu propiedad se muestra con fotos, características y precio claro para compradores reales.</p>
          </div>
          <div className="rounded-[2rem] border border-[#262626] bg-[#171717] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.3)]">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#D4A574] text-black">
              2
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Asegura el depósito con Stripe</h3>
            <p className="text-sm text-[#B8B5AD] leading-relaxed">Los compradores confían más cuando la reserva se protege con pago seguro.</p>
          </div>
          <div className="rounded-[2rem] border border-[#262626] bg-[#171717] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.3)]">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-[#D4A574] text-black">
              3
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Soporte legal y notarial</h3>
            <p className="text-sm text-[#B8B5AD] leading-relaxed">Te ayudamos con herencias, escrituras y corrección de metros para cerrar sin riesgos.</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-[2rem] border border-[#262626] bg-[#171717] p-10 shadow-[0_40px_90px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm uppercase tracking-[0.28em] text-[#A1865A]">Empieza hoy</p>
              <h2 className="text-4xl font-bold text-white">Tu propiedad puede venderse sin inmobiliaria</h2>
              <p className="text-base leading-8 text-[#B8B5AD]">Haz todo desde una sola plataforma: publicación, reserva con Stripe y cierre con apoyo legal. Solo un agente para ayudarte.</p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4A574] px-8 py-4 text-base font-semibold text-black hover:bg-[#E5C28C] transition"
            >
              Iniciar venta ahora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
