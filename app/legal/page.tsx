import Link from 'next/link'
import { Home, Scale } from 'lucide-react'

export default function LegalPage() {
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
            <Scale className="w-10 h-10 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">Aviso Legal</h1>
          </div>

          <p className="text-gray-600 mb-8">
            <strong>Última actualización:</strong> Mayo 13, 2026
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Datos identificativos</h2>
              <p className="text-gray-700 mb-4">
                En cumplimiento con el deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio, 
                de Servicios de la Sociedad de la Información y del Comercio Electrónico (LSSI), 
                el titular de este sitio web le informa de lo siguiente:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Denominación social:</strong> Vendoya SL</li>
                <li><strong>NIF:</strong> B-12345678</li>
                <li><strong>Domicilio social:</strong> Calle Gran Vía 1, 28013 Madrid, España</li>
                <li><strong>Email:</strong> <a href="mailto:info@vendoya.es" className="text-emerald-600 hover:text-emerald-700">info@vendoya.es</a></li>
                <li><strong>Teléfono:</strong> +34 911 234 567</li>
                <li><strong>Registro Mercantil:</strong> Madrid, Tomo 1234, Folio 56, Hoja M-78901</li>
                <li><strong>Nombre de dominio:</strong> vendoya.es</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Objeto</h2>
              <p className="text-gray-700">
                El presente aviso legal regula el uso y utilización del sitio web vendoya.es, del que es titular Vendoya SL.
                La navegación por el sitio web atribuye la condición de usuario del mismo e implica la aceptación plena y sin reservas 
                de todas y cada una de las disposiciones incluidas en este Aviso Legal.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Condiciones de uso</h2>
              <p className="text-gray-700 mb-4">
                El acceso y uso del sitio web se rige por las siguientes condiciones:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>El uso del sitio web y sus servicios es responsabilidad exclusiva del usuario</li>
                <li>El usuario se compromete a hacer un uso adecuado de los contenidos</li>
                <li>Queda prohibido el uso del sitio web para fines ilícitos o contrarios a la buena fe</li>
                <li>El usuario no debe causar daños a los sistemas del sitio web</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Propiedad intelectual e industrial</h2>
              <p className="text-gray-700 mb-4">
                Todos los contenidos del sitio web (textos, fotografías, gráficos, imágenes, iconos, tecnología, software, 
                así como su diseño gráfico y códigos fuente) son propiedad intelectual de Vendoya SL o de terceros, 
                sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación reconocidos por la normativa vigente 
                en materia de propiedad intelectual sobre los mismos.
              </p>
              <p className="text-gray-700">
                Quedan expresamente prohibidas la reproducción, distribución y comunicación pública, incluida su modalidad de puesta 
                a disposición, de la totalidad o parte de los contenidos de esta página web, con fines comerciales, 
                en cualquier soporte y por cualquier medio técnico, sin la autorización de Vendoya SL.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Exclusión de garantías y responsabilidad</h2>
              <p className="text-gray-700 mb-4">
                Vendoya SL no se hace responsable, en ningún caso, de los daños y perjuicios de cualquier naturaleza que pudieran ocasionar:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Errores u omisiones en los contenidos</li>
                <li>Falta de disponibilidad del sitio web o transmisión de virus o programas maliciosos</li>
                <li>Uso ilícito o incorrecto del sitio web</li>
                <li>Falta de utilidad o rendimiento de los contenidos</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Vendoya SL no garantiza la disponibilidad y continuidad del funcionamiento del sitio web. 
                Cuando sea razonablemente posible, advertirá previamente de las interrupciones en el funcionamiento del sitio web.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Enlaces</h2>
              <p className="text-gray-700 mb-4">
                <strong>6.1 Enlaces desde este sitio web:</strong>
              </p>
              <p className="text-gray-700 mb-4">
                En el caso de que se dispusiesen enlaces o hipervínculos hacia otros sitios de Internet, 
                Vendoya SL no ejercerá ningún tipo de control sobre dichos sitios y contenidos. 
                En ningún caso asumirá responsabilidad alguna por los contenidos de algún enlace perteneciente a un sitio web ajeno.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>6.2 Enlaces hacia este sitio web:</strong>
              </p>
              <p className="text-gray-700">
                Si cualquier usuario, entidad o sitio web desease establecer algún tipo de enlace hacia el sitio web deberá:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mt-2">
                <li>Únicamente estará permitido el enlace a la página principal (https://vendoya.es)</li>
                <li>No crear un frame sobre las páginas web</li>
                <li>No realizar manifestaciones falsas, inexactas o incorrectas sobre Vendoya SL</li>
                <li>No incluir contenidos ilícitos, contrarios a las buenas costumbres o al orden público</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Protección de datos</h2>
              <p className="text-gray-700">
                Vendoya SL cumple con el Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo de 27 de abril de 2016 
                relativo a la protección de las personas físicas (RGPD) y la Ley Orgánica 3/2018, de 5 de diciembre, 
                de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
              </p>
              <p className="text-gray-700 mt-4">
                Para más información, consulta nuestra <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700">Política de Privacidad</Link>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Modificaciones</h2>
              <p className="text-gray-700">
                Vendoya SL se reserva el derecho de efectuar sin previo aviso las modificaciones que considere oportunas en el sitio web, 
                pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios que se presten a través de la misma como 
                la forma en la que éstos aparezcan presentados o localizados.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Legislación aplicable y jurisdicción</h2>
              <p className="text-gray-700">
                El presente aviso legal se rige en todos y cada uno de sus extremos por la ley española. 
                Para la resolución de cualquier controversia relativa a su interpretación o aplicación, 
                las partes se someten a la jurisdicción de los Juzgados y Tribunales de Madrid, 
                renunciando expresamente a cualquier otro fuero que pudiera corresponderles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contacto</h2>
              <p className="text-gray-700">
                Para cualquier cuestión relativa al presente aviso legal:<br />
                <strong>Email:</strong> <a href="mailto:legal@vendoya.es" className="text-emerald-600 hover:text-emerald-700">legal@vendoya.es</a><br />
                <strong>Teléfono:</strong> +34 911 234 567<br />
                <strong>Dirección:</strong> Calle Gran Vía 1, 28013 Madrid, España
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
