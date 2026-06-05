'use client';

import { useState, FormEvent, useEffect } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Clock, Wallet } from 'lucide-react';

// Paleta
// negro:    #0A0A0A
// verde:    #0F4A3F (principal)
// verde-h:  #0C3A33 (hover)
// fondo:    #FAFAF9

const ZONAS = ['Antequera', 'Archidona', 'Bobadilla', 'Otros'];

const TIPOS_VIVIENDA = [
  { value: 'casa_pueblo', label: 'Casa' },
  { value: 'piso', label: 'Piso' },
  { value: 'chalet', label: 'Chalet' },
  { value: 'otra', label: 'Otro' },
];

export default function InmobiliariaErikLanding() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    ubicacion: '',
    tipo_vivienda: '',
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !form.nombre.trim() ||
      !form.telefono.trim() ||
      !form.ubicacion.trim() ||
      !form.tipo_vivienda
    ) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const params =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : null;

      const res = await fetch('/api/inmobiliaria-erik-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          // Campo requerido en DB pero ya no se pregunta al usuario
          necesita_reforma: 'esta_bien',
          source: 'inmobiliaria-erik-landing',
          utm_source: params?.get('utm_source') || null,
          utm_medium: params?.get('utm_medium') || null,
          utm_campaign: params?.get('utm_campaign') || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (success) return <SuccessScreen nombre={form.nombre} />;

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#0A0A0A]">
      {/* Header minimal */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0F4A3F] rounded-lg flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12l9-9 9 9" />
              <path d="M5 10v10h14V10" />
            </svg>
          </div>
          <p className="font-semibold tracking-tight">Antequera y Comarca</p>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        {/* Hero */}
        <div className="lg:pt-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] mb-5">
            Compramos tu{' '}
            <span className="text-[#0F4A3F]">casa o piso</span> en Antequera y
            alrededores
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
            La tomamos tal como está
            <span className="mx-2 text-[#0F4A3F]">•</span>
            Sin reformas
            <span className="mx-2 text-[#0F4A3F]">•</span>
            Pago rápido
          </p>

          {/* Trust pills */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-lg">
            <TrustItem icon={<ShieldCheck className="w-4 h-4" />} text="Sin compromiso" />
            <TrustItem icon={<Clock className="w-4 h-4" />} text="Respuesta en 24 h" />
            <TrustItem icon={<Wallet className="w-4 h-4" />} text="Oferta real" />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8">
          <p className="text-base text-gray-700 mb-6 leading-relaxed">
            Déjanos tus datos y te contactamos en menos de{' '}
            <strong className="text-[#0A0A0A]">24 horas</strong> con una oferta
            real.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Ej: María García"
                className="form-input"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Teléfono / WhatsApp
              </label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)}
                placeholder="Ej: 600 123 456"
                className="form-input"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Zona de la propiedad
              </label>
              <select
                value={form.ubicacion}
                onChange={(e) => update('ubicacion', e.target.value)}
                className="form-input"
              >
                <option value="">Selecciona una zona</option>
                {ZONAS.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">
                Tipo de propiedad
              </label>
              <select
                value={form.tipo_vivienda}
                onChange={(e) => update('tipo_vivienda', e.target.value)}
                className="form-input"
              >
                <option value="">Selecciona un tipo</option>
                {TIPOS_VIVIENDA.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#0F4A3F] text-white rounded-xl font-semibold text-base hover:bg-[#0C3A33] disabled:opacity-60 disabled:cursor-not-allowed transition mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Quiero vender mi propiedad'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center pt-2">
              Al enviar aceptas que te contactemos para tratar tu solicitud.
            </p>
          </form>
        </div>
      </div>

      <footer className="border-t border-gray-200 mt-12 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Antequera y Comarca
      </footer>

      <style jsx global>{`
        .form-input {
          width: 100%;
          padding: 0.85rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.95rem;
          color: #0a0a0a;
          background: #ffffff;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }
        .form-input::placeholder {
          color: #9ca3af;
        }
        .form-input:focus {
          outline: none;
          border-color: #0f4a3f;
          box-shadow: 0 0 0 3px rgba(15, 74, 63, 0.15);
        }
        select.form-input {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230A0A0A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 12px;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}

function TrustItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
      <span className="text-[#0F4A3F]">{icon}</span>
      <span className="text-xs font-medium text-gray-700">{text}</span>
    </div>
  );
}

function SuccessScreen({ nombre }: { nombre: string }) {
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const allowed =
      typeof window !== 'undefined' &&
      (window.opener != null ||
        /Instagram|FBAN|FBAV|FB_IAB|Line|WhatsApp/i.test(
          navigator.userAgent || ''
        ));
    setCanClose(allowed);

    if (allowed) {
      const t = setTimeout(() => {
        try {
          window.close();
        } catch {
          /* noop */
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    try {
      window.close();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <div className="w-16 h-16 bg-[#0F4A3F] rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3 tracking-tight">
          ¡Solicitud recibida!
        </h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Gracias <span className="font-semibold">{nombre}</span>. Te
          contactaremos en menos de <strong>24 horas</strong> al teléfono que
          has indicado.
        </p>

        {canClose ? (
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F4A3F] text-white rounded-xl hover:bg-[#0C3A33] transition font-semibold"
          >
            Cerrar ventana
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium border border-gray-200">
            Ya puedes cerrar esta pestaña ✕
          </div>
        )}
      </div>
    </div>
  );
}
