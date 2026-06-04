'use client';

import { useState, FormEvent, useEffect } from 'react';
import {
  Home,
  Phone,
  MapPin,
  Building2,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';

const ZONAS = [
  { value: 'Antequera', label: 'Antequera' },
  { value: 'Bobadilla', label: 'Bobadilla' },
  { value: 'Archidona', label: 'Archidona' },
  { value: 'Otros', label: 'Otros' },
];

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
      setError('Por favor completa todos los campos obligatorios.');
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

  if (success) {
    return <SuccessScreen nombre={form.nombre} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-stone-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur sticky top-0 z-30 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E30613] rounded-xl flex items-center justify-center shadow-md">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-xs text-[#E30613] font-medium">
              Inmobiliaria Erik
            </p>
            <p className="font-bold text-gray-900">Antequera y comarca</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Hero / info */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-[#b8050f]" />
            <span className="text-sm font-semibold text-[#8a040b]">
              Valoración 100% gratuita y sin compromiso
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            Completa tus datos y te{' '}
            <span className="text-[#E30613]">contactamos en menos de 24 h</span>{' '}
            con una oferta real.
          </h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8 lg:p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Cuéntanos sobre tu propiedad
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Los campos marcados con <span className="text-[#E30613]">*</span> son
            obligatorios.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <Field
              label="Nombre y apellido"
              required
              icon={<User />}
            >
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => update('nombre', e.target.value)}
                placeholder="Ej: María García"
                className="form-input"
                maxLength={200}
              />
            </Field>

            <Field
              label="Teléfono / WhatsApp"
              required
              icon={<Phone className="w-4 h-4" />}
            >
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)}
                placeholder="Ej: 600 123 456"
                className="form-input"
                maxLength={50}
              />
            </Field>

            <Field
              label="¿Dónde está ubicada la propiedad?"
              required
              icon={<MapPin className="w-4 h-4" />}
            >
              <div className="grid grid-cols-2 gap-2">
                {ZONAS.map((opt) => (
                  <Pill
                    key={opt.value}
                    selected={form.ubicacion === opt.value}
                    onClick={() => update('ubicacion', opt.value)}
                    label={opt.label}
                  />
                ))}
              </div>
            </Field>

            <Field
              label="¿Qué tipo de vivienda es?"
              required
              icon={<Building2 className="w-4 h-4" />}
            >
              <div className="grid grid-cols-2 gap-2">
                {TIPOS_VIVIENDA.map((opt) => (
                  <Pill
                    key={opt.value}
                    selected={form.tipo_vivienda === opt.value}
                    onClick={() => update('tipo_vivienda', opt.value)}
                    label={opt.label}
                  />
                ))}
              </div>
            </Field>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E30613] text-white rounded-xl font-semibold text-lg hover:bg-[#b8050f] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-lg shadow-[#E30613]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>Solicitar mi valoración gratuita</>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Al enviar aceptas que Inmobiliaria Erik te contacte para tratar tu
              solicitud.
            </p>
          </form>
        </div>
      </div>

      <footer className="border-t border-gray-100 mt-10 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Inmobiliaria Erik · Antequera y comarca
      </footer>

      <style jsx global>{`
        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.95rem;
          color: #111827;
          background: #f9fafb;
          transition: all 0.15s;
        }
        .form-input:focus {
          outline: none;
          border-color: #E30613;
          background: white;
          box-shadow: 0 0 0 3px rgba(227, 6, 19, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
        {icon && <span className="text-[#E30613]">{icon}</span>}
        {label}
        {required && <span className="text-[#E30613]">*</span>}
      </label>
      {children}
    </div>
  );
}

function Pill({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
        selected
          ? 'bg-[#E30613] text-white border-[#E30613] shadow-md shadow-[#E30613]/20'
          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-red-300 hover:bg-white'
      }`}
    >
      {label}
    </button>
  );
}

function SuccessScreen({ nombre }: { nombre: string }) {
  // Detecta si el navegador permitirá cerrar la pestaña con window.close().
  // Solo es posible cuando la pestaña fue abierta por script (popup, webview
  // de Instagram/Facebook/WhatsApp, target="_blank" desde un botón). Si el
  // usuario abrió la URL manualmente, los navegadores BLOQUEAN window.close()
  // por seguridad — no hay forma de saltar esa regla.
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const allowed =
      typeof window !== 'undefined' &&
      (window.opener != null ||
        // Webview de apps móviles suele permitirlo
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-stone-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-red-100">
        <div className="w-20 h-20 bg-[#E30613] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          ¡Solicitud recibida!
        </h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Gracias <span className="font-semibold">{nombre}</span>. Nuestro
          equipo de <strong>Inmobiliaria Erik</strong> se pondrá en contacto
          contigo en menos de <strong>24 horas</strong> a través del teléfono
          que has indicado.
        </p>

        {canClose ? (
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E30613] text-white rounded-xl hover:bg-[#b8050f] transition font-semibold"
          >
            Cerrar ventana
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-red-50 text-[#8a040b] rounded-xl font-semibold border border-red-200">
            Ya puedes cerrar esta pestaña ✕
          </div>
        )}
      </div>
    </div>
  );
}

// Pequeño icono User inline para evitar import extra
function User() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
