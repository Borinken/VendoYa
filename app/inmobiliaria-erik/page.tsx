'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Building2,
  Building,
  HelpCircle,
  MapPin,
  Zap,
  Calendar,
  Search,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  User,
  Sparkles,
} from 'lucide-react';

// ===== Paleta dark premium =====
// bg:        #0A0A0A
// card:      #171717
// border:    #262626
// border-h:  #3F3F46
// text:      #FAFAFA
// muted:     #A1A1AA
// accent:    #D4A574 (dorado cobre)
// accent-h:  #C29560

type Step = 0 | 1 | 2 | 3 | 4;

interface Option {
  value: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
}

const TIPOS: Option[] = [
  { value: 'casa_pueblo', label: 'Casa', icon: <Home className="w-7 h-7" /> },
  { value: 'piso', label: 'Piso', icon: <Building2 className="w-7 h-7" /> },
  { value: 'chalet', label: 'Chalet', icon: <Building className="w-7 h-7" /> },
  { value: 'otra', label: 'Otro', icon: <HelpCircle className="w-7 h-7" /> },
];

const ZONAS: Option[] = [
  { value: 'Antequera', label: 'Antequera', icon: <MapPin className="w-7 h-7" /> },
  { value: 'Archidona', label: 'Archidona', icon: <MapPin className="w-7 h-7" /> },
  { value: 'Bobadilla', label: 'Bobadilla', icon: <MapPin className="w-7 h-7" /> },
  { value: 'Otros', label: 'Otros', icon: <MapPin className="w-7 h-7" /> },
];

const URGENCIAS: Option[] = [
  {
    value: 'inmediato',
    label: 'Lo antes posible',
    icon: <Zap className="w-7 h-7" />,
    hint: 'Quiero vender ya',
  },
  {
    value: '1_3_meses',
    label: 'En 1-3 meses',
    icon: <Calendar className="w-7 h-7" />,
    hint: 'En los próximos meses',
  },
  {
    value: '3_6_meses',
    label: 'En 3-6 meses',
    icon: <Calendar className="w-7 h-7" />,
    hint: 'Sin prisa',
  },
  {
    value: 'explorando',
    label: 'Solo explorando',
    icon: <Search className="w-7 h-7" />,
    hint: 'Quiero saber el valor',
  },
];

const URGENCIA_LABELS: Record<string, string> = Object.fromEntries(
  URGENCIAS.map((u) => [u.value, u.label])
);

export default function InmobiliariaErikLanding() {
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipo_vivienda: '',
    ubicacion: '',
    urgencia: '',
    nombre: '',
    telefono: '',
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Auto-avance al elegir opción en pasos 1-3
  const pickAndAdvance = (key: 'tipo_vivienda' | 'ubicacion' | 'urgencia', value: string, nextStep: Step) => {
    update(key, value);
    setError(null);
    // pequeño delay para que se vea el "selected" antes de pasar
    setTimeout(() => setStep(nextStep), 220);
  };

  const submit = async () => {
    setError(null);
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('Por favor completa tu nombre y teléfono.');
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
          nombre: form.nombre,
          telefono: form.telefono,
          ubicacion: form.ubicacion,
          tipo_vivienda: form.tipo_vivienda,
          necesita_reforma: 'esta_bien',
          comentarios: `Urgencia: ${URGENCIA_LABELS[form.urgencia] || form.urgencia}`,
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

  // % de progreso (0 en welcome, 25/50/75/100)
  const progress = useMemo(() => {
    if (step === 0) return 0;
    return step * 25;
  }, [step]);

  if (success) return <SuccessScreen nombre={form.nombre} />;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#1F1F1F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4A574] to-[#A87B4B] flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="black"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12l9-9 9 9" />
                <path d="M5 10v10h14V10" />
              </svg>
            </div>
            <p className="font-semibold tracking-tight text-sm">
              Antequera y Comarca
            </p>
          </div>
          {step > 0 && (
            <span className="text-xs font-medium text-[#A1A1AA]">
              Paso {step} de 4
            </span>
          )}
        </div>
        {/* Barra de progreso */}
        {step > 0 && (
          <div className="h-1 bg-[#171717]">
            <div
              className="h-full bg-gradient-to-r from-[#D4A574] to-[#E5C28C] transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-2xl">
          {step === 0 && <Welcome onStart={() => setStep(1)} />}

          {step === 1 && (
            <StepCards
              eyebrow="Sobre tu propiedad"
              title="¿Qué tipo de propiedad quieres vender?"
              subtitle="Selecciona una opción"
              options={TIPOS}
              selected={form.tipo_vivienda}
              onSelect={(v) => pickAndAdvance('tipo_vivienda', v, 2)}
            />
          )}

          {step === 2 && (
            <StepCards
              eyebrow="Ubicación"
              title="¿En qué zona está la propiedad?"
              subtitle="Compramos en Antequera y alrededores"
              options={ZONAS}
              selected={form.ubicacion}
              onSelect={(v) => pickAndAdvance('ubicacion', v, 3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepCards
              eyebrow="Tu plan"
              title="¿Cuándo te gustaría vender?"
              subtitle="Esto nos ayuda a darte la mejor oferta"
              options={URGENCIAS}
              selected={form.urgencia}
              onSelect={(v) => pickAndAdvance('urgencia', v, 4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <StepContact
              form={form}
              update={update}
              error={error}
              loading={loading}
              onBack={() => setStep(3)}
              onSubmit={submit}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-[#1F1F1F] py-6 text-center text-xs text-[#71717A]">
        © {new Date().getFullYear()} Antequera y Comarca · Tus datos están a salvo
      </footer>
    </div>
  );
}

// ============ Welcome ============
function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center animate-[fadeIn_400ms_ease-out]">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171717] border border-[#262626] mb-8">
        <Sparkles className="w-3.5 h-3.5 text-[#D4A574]" />
        <span className="text-xs font-medium text-[#D4A574]">
          Valoración gratuita · sin compromiso
        </span>
      </div>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
        Compramos tu{' '}
        <span className="bg-gradient-to-r from-[#D4A574] to-[#E5C28C] bg-clip-text text-transparent">
          casa o piso
        </span>
        <br />
        en Antequera
      </h1>

      <p className="text-lg text-[#A1A1AA] mb-10 max-w-md mx-auto leading-relaxed">
        La tomamos tal como está. Sin reformas. Pago rápido.
        <br />
        <span className="text-[#FAFAFA]">Descúbrelo en 30 segundos.</span>
      </p>

      <button
        onClick={onStart}
        className="group inline-flex items-center gap-2 px-7 py-4 bg-[#D4A574] text-black rounded-xl font-semibold text-base hover:bg-[#E5C28C] transition shadow-[0_0_40px_rgba(212,165,116,0.25)]"
      >
        Empezar ahora
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>

      <div className="mt-10 grid grid-cols-3 gap-3 max-w-md mx-auto">
        <Stat label="Sin compromiso" />
        <Stat label="Respuesta 24 h" />
        <Stat label="Oferta real" />
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-[#171717] border border-[#262626]">
      <p className="text-xs font-medium text-[#A1A1AA]">{label}</p>
    </div>
  );
}

// ============ Step Cards (pasos 1-3) ============
function StepCards({
  eyebrow,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onBack,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  options: Option[];
  selected: string;
  onSelect: (v: string) => void;
  onBack?: () => void;
}) {
  return (
    <div className="animate-[slideIn_350ms_ease-out]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A574] mb-3">
        {eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 leading-tight">
        {title}
      </h2>
      <p className="text-[#A1A1AA] mb-8">{subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`group relative text-left p-5 rounded-2xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-[#D4A574]/10 border-[#D4A574] shadow-[0_0_0_1px_#D4A574]'
                  : 'bg-[#171717] border-[#262626] hover:border-[#3F3F46] hover:bg-[#1C1C1C]'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition ${
                  isSelected
                    ? 'bg-[#D4A574] text-black'
                    : 'bg-[#262626] text-[#D4A574] group-hover:bg-[#2F2F2F]'
                }`}
              >
                {opt.icon}
              </div>
              <p className="font-semibold text-base mb-0.5">{opt.label}</p>
              {opt.hint && (
                <p className="text-xs text-[#A1A1AA]">{opt.hint}</p>
              )}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#D4A574] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-black" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="mt-8 inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </button>
      )}
    </div>
  );
}

// ============ Step contacto (paso 4) ============
function StepContact({
  form,
  update,
  error,
  loading,
  onBack,
  onSubmit,
}: {
  form: { nombre: string; telefono: string; tipo_vivienda: string; ubicacion: string; urgencia: string };
  update: (k: 'nombre' | 'telefono', v: string) => void;
  error: string | null;
  loading: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-[slideIn_350ms_ease-out]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A574] mb-3">
        Último paso
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2 leading-tight">
        ¿A dónde te llamamos?
      </h2>
      <p className="text-[#A1A1AA] mb-8">
        Te contactamos en menos de <strong className="text-white">24 horas</strong>{' '}
        con una oferta real.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Ej: María García"
              className="dark-input pl-11"
              maxLength={200}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-2">
            Teléfono / WhatsApp
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => update('telefono', e.target.value)}
              placeholder="Ej: 600 123 456"
              className="dark-input pl-11"
              maxLength={50}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#D4A574] text-black rounded-xl font-semibold text-base hover:bg-[#E5C28C] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-[0_0_40px_rgba(212,165,116,0.25)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              Recibir mi oferta
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-xs text-[#71717A] text-center pt-2">
          Al enviar aceptas que te contactemos. Tus datos están protegidos.
        </p>
      </form>

      <button
        onClick={onBack}
        type="button"
        className="mt-6 inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Atrás
      </button>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          padding: 0.95rem 1rem;
          background: #171717;
          border: 1px solid #262626;
          border-radius: 0.75rem;
          color: #fafafa;
          font-size: 0.95rem;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dark-input::placeholder {
          color: #52525b;
        }
        .dark-input:focus {
          outline: none;
          border-color: #d4a574;
          box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.18);
        }
      `}</style>
    </div>
  );
}

// ============ Success ============
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
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4A574] to-[#A87B4B] flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(212,165,116,0.35)]">
          <CheckCircle2 className="w-10 h-10 text-black" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          ¡Solicitud recibida!
        </h1>
        <p className="text-[#A1A1AA] mb-8 leading-relaxed">
          Gracias <span className="text-white font-semibold">{nombre}</span>. Te
          contactaremos en menos de{' '}
          <span className="text-white font-semibold">24 horas</span> con una
          oferta real para tu propiedad.
        </p>

        {canClose ? (
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-black rounded-xl hover:bg-[#E5C28C] transition font-semibold"
          >
            Cerrar ventana
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#171717] text-[#A1A1AA] rounded-xl font-medium border border-[#262626]">
            Ya puedes cerrar esta pestaña ✕
          </div>
        )}
      </div>
    </div>
  );
}
