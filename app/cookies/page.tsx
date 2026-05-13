import Link from 'next/link'
import { Home, Cookie } from 'lucide-react'

export default function CookiesPage() {
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
            <Cookie className="w-10 h-10 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Política de Cookies</h1>
          </div>

          <p className="text-gray-600 mb-8">
            <strong>Última actualización:</strong> Mayo 13, 2026
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Qué son las cookies?</h2>
              <p className="text-gray-700">
                Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. 
                Permiten que el sitio web recuerde tus acciones y preferencias durante un período de tiempo.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Cómo usamos las cookies?</h2>
              <p className="text-gray-700 mb-4">
                Vendoya utiliza cookies para:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Mantener tu sesión activa</li>
                <li>Recordar tus preferencias</li>
                <li>Analizar el uso de la plataforma</li>
                <li>Mejorar la seguridad</li>
                <li>Personalizar tu experiencia</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tipos de cookies que usamos</h2>
              
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">1. Cookies Esenciales (Necesarias)</h3>
                <p className="text-gray-700 mb-3">
                  <strong>Estas cookies son necesarias para el funcionamiento del sitio y no se pueden desactivar.</strong>
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald-200">
                      <th className="text-left py-2 text-gray-900">Cookie</th>
                      <th className="text-left py-2 text-gray-900">Propósito</th>
                      <th className="text-left py-2 text-gray-900">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-emerald-100">
                      <td className="py-2">sb-auth-token</td>
                      <td className="py-2">Autenticación de usuario</td>
                      <td className="py-2">Sesión</td>
                    </tr>
                    <tr className="border-b border-emerald-100">
                      <td className="py-2">csrf_token</td>
                      <td className="py-2">Protección contra CSRF</td>
                      <td className="py-2">Sesión</td>
                    </tr>
                    <tr>
                      <td className="py-2">cookie_consent</td>
                      <td className="py-2">Guardar preferencias de cookies</td>
                      <td className="py-2">1 año</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">2. Cookies Funcionales (Opcional)</h3>
                <p className="text-gray-700 mb-3">
                  Mejoran tu experiencia recordando tus preferencias.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-200">
                      <th className="text-left py-2 text-gray-900">Cookie</th>
                      <th className="text-left py-2 text-gray-900">Propósito</th>
                      <th className="text-left py-2 text-gray-900">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-blue-100">
                      <td className="py-2">user_preferences</td>
                      <td className="py-2">Tema, idioma, configuración</td>
                      <td className="py-2">1 año</td>
                    </tr>
                    <tr>
                      <td className="py-2">dashboard_layout</td>
                      <td className="py-2">Disposición del dashboard</td>
                      <td className="py-2">6 meses</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">3. Cookies Analíticas (Opcional)</h3>
                <p className="text-gray-700 mb-3">
                  Nos ayudan a entender cómo usas la plataforma para mejorarla.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-200">
                      <th className="text-left py-2 text-gray-900">Cookie</th>
                      <th className="text-left py-2 text-gray-900">Propósito</th>
                      <th className="text-left py-2 text-gray-900">Duración</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    <tr className="border-b border-purple-100">
                      <td className="py-2">_ga</td>
                      <td className="py-2">Google Analytics</td>
                      <td className="py-2">2 años</td>
                    </tr>
                    <tr>
                      <td className="py-2">_gid</td>
                      <td className="py-2">Google Analytics</td>
                      <td className="py-2">24 horas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies de terceros</h2>
              <p className="text-gray-700 mb-4">
                Algunos servicios de terceros pueden colocar cookies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Stripe:</strong> Para procesar pagos de forma segura</li>
                <li><strong>Google Analytics:</strong> Para análisis de uso (opcional)</li>
                <li><strong>Vercel:</strong> Para funciones de hosting y CDN</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Estos servicios tienen sus propias políticas de privacidad que puedes consultar:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-2">
                <li><a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Stripe Privacy Policy</a></li>
                <li><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Google Privacy Policy</a></li>
                <li><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Vercel Privacy Policy</a></li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Gestión de cookies</h2>
              <p className="text-gray-700 mb-4">
                Puedes controlar y gestionar las cookies de varias formas:
              </p>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2">En nuestra plataforma:</h3>
              <p className="text-gray-700 mb-4">
                Usa el banner de cookies para aceptar o rechazar cookies opcionales. 
                Puedes cambiar tus preferencias en cualquier momento desde la configuración de tu cuenta.
              </p>

              <h3 className="text-lg font-bold text-gray-900 mb-2">En tu navegador:</h3>
              <p className="text-gray-700 mb-4">
                Todos los navegadores te permiten gestionar cookies:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Chrome</a></li>
                <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Firefox</a></li>
                <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Safari</a></li>
                <li><a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700">Edge</a></li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>Nota:</strong> Deshabilitar cookies esenciales puede afectar el funcionamiento de la plataforma.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Actualizaciones de esta política</h2>
              <p className="text-gray-700">
                Esta política puede actualizarse ocasionalmente. Te notificaremos de cambios significativos mediante un aviso en la plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contacto</h2>
              <p className="text-gray-700">
                Para consultas sobre cookies:<br />
                <strong>Email:</strong> <a href="mailto:privacy@vendoya.es" className="text-emerald-600 hover:text-emerald-700">privacy@vendoya.es</a>
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Esta política cumple con la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI) y el RGPD.
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
