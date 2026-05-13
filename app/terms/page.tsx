import Link from 'next/link'
import { Home, FileText } from 'lucide-react'

export default function TermsPage() {
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
          <Link
            href="/"
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200">
          <div className="flex items-center space-x-3 mb-8">
            <FileText className="w-10 h-10 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Términos y Condiciones</h1>
          </div>

          <p className="text-gray-600 mb-8">
            <strong>Última actualización:</strong> Mayo 13, 2026
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Aceptación de los términos</h2>
              <p className="text-gray-700">
                Al acceder y usar Vendoya (&quot;el Servicio&quot;), aceptas estar sujeto a estos Términos y Condiciones. 
                Si no estás de acuerdo con alguna parte de estos términos, no debes usar nuestro servicio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Descripción del servicio</h2>
              <p className="text-gray-700 mb-4">
                Vendoya es una plataforma SaaS (Software as a Service) de gestión CRM para agencias inmobiliarias que incluye:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Gestión de propiedades, contactos y contratos</li>
                <li>Automatización de procesos con IA</li>
                <li>Análisis de inversiones</li>
                <li>Integraciones con servicios terceros</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Registro y cuenta</h2>
              <p className="text-gray-700 mb-4">
                Para usar el Servicio, debes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Ser mayor de 18 años o representar a una entidad legal</li>
                <li>Proporcionar información veraz y actualizada</li>
                <li>Mantener la seguridad de tu cuenta y contraseña</li>
                <li>Notificarnos inmediatamente de cualquier uso no autorizado</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Eres responsable de todas las actividades que ocurran bajo tu cuenta.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Planes y pagos</h2>
              <p className="text-gray-700 mb-4">
                <strong>4.1 Prueba gratuita:</strong> Ofrecemos 14 días de prueba gratuita. No se requiere tarjeta de crédito.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.2 Suscripciones:</strong> Después del trial, debes suscribirte a un plan de pago para continuar usando el servicio.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.3 Facturación:</strong> 
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Los pagos se procesan mensual o anualmente según tu plan</li>
                <li>Todos los precios son en euros (€) e incluyen IVA</li>
                <li>Los pagos son procesados por Stripe</li>
                <li>Las renovaciones son automáticas</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>4.4 Cancelación:</strong> Puedes cancelar en cualquier momento. No hay reembolsos por períodos parciales no utilizados.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Uso aceptable</h2>
              <p className="text-gray-700 mb-4">
                No está permitido:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Usar el servicio para actividades ilegales</li>
                <li>Intentar acceder a áreas no autorizadas del sistema</li>
                <li>Enviar spam o contenido malicioso</li>
                <li>Realizar ingeniería inversa del software</li>
                <li>Revender o redistribuir el servicio sin autorización</li>
                <li>Sobrecargar intencionalmente la infraestructura</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Propiedad intelectual</h2>
              <p className="text-gray-700 mb-4">
                El Servicio y todo su contenido (código, diseño, textos, logos) son propiedad de Vendoya SL y están protegidos por leyes de propiedad intelectual.
              </p>
              <p className="text-gray-700">
                Tus datos (propiedades, contactos, documentos) siguen siendo de tu propiedad. Nos otorgas una licencia limitada para procesarlos y proporcionar el servicio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disponibilidad del servicio</h2>
              <p className="text-gray-700">
                Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos tiempo de actividad del 100%. 
                Podemos realizar mantenimientos programados con aviso previo cuando sea posible.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitación de responsabilidad</h2>
              <p className="text-gray-700 mb-4">
                El servicio se proporciona &quot;tal cual&quot;. Hasta el máximo permitido por la ley:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>No garantizamos que el servicio sea libre de errores</li>
                <li>No somos responsables por pérdida de datos (mantén backups)</li>
                <li>No somos responsables por daños indirectos o pérdidas de beneficios</li>
                <li>Nuestra responsabilidad está limitada al importe pagado en los últimos 12 meses</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Terminación</h2>
              <p className="text-gray-700 mb-4">
                Podemos suspender o terminar tu cuenta si:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Violas estos términos</li>
                <li>Tu pago es rechazado o fraudulento</li>
                <li>Realizas actividades que pongan en riesgo el servicio</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Tras la terminación, tendrás 30 días para exportar tus datos antes de que sean eliminados permanentemente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Modificaciones</h2>
              <p className="text-gray-700">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Te notificaremos cambios significativos por email con 30 días de antelación. 
                El uso continuado del servicio implica aceptación de los nuevos términos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Legislación aplicable</h2>
              <p className="text-gray-700">
                Estos términos se rigen por las leyes de España. 
                Cualquier disputa se resolverá en los tribunales de Madrid, España.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contacto</h2>
              <p className="text-gray-700">
                Para consultas sobre estos términos:<br />
                <strong>Email:</strong> <a href="mailto:legal@vendoya.es" className="text-emerald-600 hover:text-emerald-700">legal@vendoya.es</a><br />
                <strong>Dirección:</strong> Vendoya SL, Madrid, España
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
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
            <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors">
              Cookies
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
