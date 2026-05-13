import Link from 'next/link'
import { Home, Shield } from 'lucide-react'

export default function PrivacyPage() {
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
            <Shield className="w-10 h-10 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Política de Privacidad</h1>
          </div>

          <p className="text-gray-600 mb-8">
            <strong>Última actualización:</strong> Mayo 13, 2026
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Información que recopilamos</h2>
              <p className="text-gray-700 mb-4">
                En Vendoya recopilamos la siguiente información:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Información de cuenta:</strong> Nombre, email, contraseña (encriptada)</li>
                <li><strong>Información de empresa:</strong> Nombre de agencia, dirección, teléfono</li>
                <li><strong>Datos de uso:</strong> Cómo usas la plataforma, funcionalidades utilizadas</li>
                <li><strong>Datos de propiedades y contactos:</strong> Información que introduces en el CRM</li>
                <li><strong>Información de pago:</strong> Procesada por Stripe (no almacenamos tarjetas)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Cómo usamos tu información</h2>
              <p className="text-gray-700 mb-4">
                Utilizamos tu información para:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Proporcionar y mejorar nuestros servicios</li>
                <li>Procesar pagos y gestionar suscripciones</li>
                <li>Enviar actualizaciones importantes del servicio</li>
                <li>Análisis y mejora de la experiencia de usuario</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Base legal (RGPD)</h2>
              <p className="text-gray-700 mb-4">
                Procesamos tus datos personales bajo las siguientes bases legales:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Consentimiento:</strong> Al crear una cuenta y usar nuestros servicios</li>
                <li><strong>Ejecución del contrato:</strong> Para proporcionar el servicio contratado</li>
                <li><strong>Interés legítimo:</strong> Mejora del servicio y prevención de fraude</li>
                <li><strong>Obligación legal:</strong> Cumplimiento de requisitos legales y fiscales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Compartir información</h2>
              <p className="text-gray-700 mb-4">
                Solo compartimos tu información con:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Proveedores de servicios:</strong> Supabase (base de datos), Vercel (hosting), Stripe (pagos)</li>
                <li><strong>Cumplimiento legal:</strong> Cuando sea requerido por ley</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>Nunca vendemos tus datos a terceros.</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Tus derechos (RGPD)</h2>
              <p className="text-gray-700 mb-4">
                Tienes derecho a:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Acceso:</strong> Solicitar copia de tus datos personales</li>
                <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
                <li><strong>Supresión:</strong> Solicitar eliminación de tus datos</li>
                <li><strong>Portabilidad:</strong> Recibir tus datos en formato portable</li>
                <li><strong>Oposición:</strong> Oponerte al procesamiento de tus datos</li>
                <li><strong>Limitación:</strong> Limitar el procesamiento de tus datos</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Para ejercer estos derechos, contacta: <a href="mailto:privacy@vendoya.es" className="text-emerald-600 hover:text-emerald-700">privacy@vendoya.es</a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Seguridad de datos</h2>
              <p className="text-gray-700">
                Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-4">
                <li>Encriptación de datos sensibles</li>
                <li>Conexiones HTTPS/SSL</li>
                <li>Autenticación de dos factores (disponible)</li>
                <li>Auditorías de seguridad regulares</li>
                <li>Acceso restringido a datos personales</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Retención de datos</h2>
              <p className="text-gray-700">
                Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir con obligaciones legales (generalmente 6 años en España para datos fiscales).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies</h2>
              <p className="text-gray-700">
                Utilizamos cookies esenciales para el funcionamiento del servicio y cookies analíticas (con tu consentimiento). 
                Consulta nuestra <Link href="/cookies" className="text-emerald-600 hover:text-emerald-700">Política de Cookies</Link> para más información.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Transferencias internacionales</h2>
              <p className="text-gray-700">
                Tus datos pueden ser transferidos a servidores ubicados en la UE. Todos nuestros proveedores cumplen con el RGPD y tienen medidas de protección adecuadas.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contacto</h2>
              <p className="text-gray-700">
                Para cualquier consulta sobre privacidad:
              </p>
              <p className="text-gray-700 mt-4">
                <strong>Email:</strong> <a href="mailto:privacy@vendoya.es" className="text-emerald-600 hover:text-emerald-700">privacy@vendoya.es</a><br />
                <strong>Dirección:</strong> Vendoya SL, Madrid, España<br />
                <strong>DPO:</strong> <a href="mailto:dpo@vendoya.es" className="text-emerald-600 hover:text-emerald-700">dpo@vendoya.es</a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Cambios a esta política</h2>
              <p className="text-gray-700">
                Nos reservamos el derecho de actualizar esta política. Te notificaremos de cambios significativos por email.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Esta política cumple con el Reglamento General de Protección de Datos (RGPD) de la UE y la LOPDGDD española.
            </p>
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
