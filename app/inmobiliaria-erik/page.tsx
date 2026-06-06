'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Home,
  Building2,
  Building,
  HelpCircle,
  MapPin,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  User,
  Sparkles,
  ShieldCheck,
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

type Step = 1 | 2 | 3 | 4 | 5;

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

const ESTADOS: Option[] = [
  {
    value: 'nuevo',
    label: 'Como nuevo',
    icon: <Sparkles className="w-6 h-6" />,
    hint: 'Recién reformada o seminueva',
  },
  {
    value: 'bueno',
    label: 'Buen estado',
    icon: <CheckCircle2 className="w-6 h-6" />,
    hint: 'Habitable, sin grandes obras',
  },
  {
    value: 'a_reformar',
    label: 'A reformar',
    icon: <Building2 className="w-6 h-6" />,
    hint: 'Necesita actualización',
  },
  {
    value: 'ruina',
    label: 'Para reformar entera',
    icon: <HelpCircle className="w-6 h-6" />,
    hint: 'Reforma integral / muy antigua',
  },
];

// ==== Calculadora de valoración =====
// Precios orientativos €/m² por zona (Antequera y comarca, 2025-2026)
const ZONE_BASE: Record<string, number> = {
  Antequera: 950,
  Archidona: 750,
  Bobadilla: 650,
  Otros: 550,
};
const TYPE_MULT: Record<string, number> = {
  casa_pueblo: 0.85,
  piso: 1.0,
  chalet: 1.4,
  otra: 0.9,
};
const STATE_MULT: Record<string, number> = {
  nuevo: 1.15,
  bueno: 1.0,
  a_reformar: 0.75,
  ruina: 0.55,
};

function roundToNice(n: number): number {
  if (n < 50_000) return Math.round(n / 1000) * 1000;
  if (n < 200_000) return Math.round(n / 2500) * 2500;
  return Math.round(n / 5000) * 5000;
}

function estimateRange(
  zona: string,
  tipo: string,
  estado: string,
  m2: number
): { low: number; high: number } | null {
  const base = ZONE_BASE[zona];
  const tm = TYPE_MULT[tipo];
  const sm = STATE_MULT[estado];
  if (!base || !tm || !sm || !m2 || m2 < 20 || m2 > 2000) return null;
  const value = base * tm * sm * m2;
  return {
    low: roundToNice(value * 0.9),
    high: roundToNice(value * 1.1),
  };
}

function formatEUR(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

const ESTADO_LABELS: Record<string, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.value, e.label])
);

export default function InmobiliariaErikLanding() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [form, setForm] = useState({
    tipo_vivienda: '',
    ubicacion: '',
    m2: '',
    dormitorios: '',
    estado_propiedad: '',
    nombre: '',
    telefono: '',
  });

  const priceEstimate = useMemo(() => {
    return estimateRange(
      form.ubicacion,
      form.tipo_vivienda,
      form.estado_propiedad,
      Number(form.m2)
    );
  }, [form.ubicacion, form.tipo_vivienda, form.estado_propiedad, form.m2]);

  // ===== Funnel tracking =====
  const sessionIdRef = (() => {
    if (typeof window === 'undefined') return { current: '' };
    let id = sessionStorage.getItem('ie_session_id');
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem('ie_session_id', id);
    }
    return { current: id };
  })();

  const track = (stepKey: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payload = JSON.stringify({
      session_id: sessionIdRef.current,
      step: stepKey,
      source: 'inmobiliaria-erik-landing',
      utm_source: params.get('utm_source'),
      utm_campaign: params.get('utm_campaign'),
    });
    // sendBeacon para no bloquear navegación al unload
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/inmobiliaria-erik-funnel',
          new Blob([payload], { type: 'application/json' })
        );
        return;
      }
    } catch {
      /* noop */
    }
    fetch('/api/inmobiliaria-erik-funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  };

  // Track page_view al montar (welcome_view se mantiene por compatibilidad histórica)
  useEffect(() => {
    track('page_view');
    track('welcome_view');
    const onUnload = () => track('page_unload');
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track entrada a cada paso
  useEffect(() => {
    if (step === 1) track('step_1_view');
    else if (step === 2) track('step_2_view');
    else if (step === 3) track('step_3_view');
    else if (step === 4) track('step_4_price_view');
    else if (step === 5) track('step_5_contacto_view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Auto-avance al elegir opción en pasos 1-2
  const pickAndAdvance = (
    key: 'tipo_vivienda' | 'ubicacion',
    value: string,
    nextStep: Step
  ) => {
    update(key, value);
    setError(null);
    if (key === 'tipo_vivienda') track('step_1_tipo');
    else if (key === 'ubicacion') track('step_2_zona');
    setTimeout(() => setStep(nextStep), 220);
  };

  // Continuar desde detalles → mostrar valoración
  const continueToPrice = () => {
    if (!form.m2 || !form.dormitorios || !form.estado_propiedad) {
      setError('Completa los 3 campos para ver tu valoración.');
      return;
    }
    const m2num = Number(form.m2);
    if (!m2num || m2num < 20 || m2num > 2000) {
      setError('Introduce los m² (entre 20 y 2000).');
      return;
    }
    setError(null);
    setCalculating(true);
    track('step_3_details_complete');
    setTimeout(() => {
      setCalculating(false);
      setStep(4);
    }, 1400);
  };

  const continueToContact = () => {
    track('step_4_price_continue');
    setStep(5);
  };

  const submit = async () => {
    setError(null);
    track('step_5_contacto_submit_attempt');
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

      const estado = form.estado_propiedad;
      // Mapeo a valores aceptados por el backend: si_bastante | un_poco | no_mucho | esta_bien
      const necesita_reforma =
        estado === 'nuevo'
          ? 'esta_bien'
          : estado === 'bueno'
          ? 'no_mucho'
          : estado === 'a_reformar'
          ? 'un_poco'
          : 'si_bastante';

      const estimacionStr = priceEstimate
        ? `${formatEUR(priceEstimate.low)} – ${formatEUR(priceEstimate.high)}`
        : 'sin estimación';

      const comentarios = [
        `m²: ${form.m2}`,
        `Dormitorios: ${form.dormitorios}`,
        `Estado: ${ESTADO_LABELS[estado] || estado}`,
        `Estimación mercado: ${estimacionStr}`,
      ].join(' · ');

      const res = await fetch('/api/inmobiliaria-erik-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          telefono: form.telefono,
          ubicacion: form.ubicacion,
          tipo_vivienda: form.tipo_vivienda,
          necesita_reforma,
          comentarios,
          source: 'inmobiliaria-erik-landing',
          utm_source: params?.get('utm_source') || null,
          utm_medium: params?.get('utm_medium') || null,
          utm_campaign: params?.get('utm_campaign') || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      track('submit_success');
      setSuccess(true);
    } catch (err) {
      track('submit_error');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // % de progreso (5 pasos)
  const progress = useMemo(() => step * 20, [step]);

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
          <span className="text-xs font-medium text-[#A1A1AA]">
            Paso {step} de 5
          </span>
        </div>
        {/* Barra de progreso */}
        <div className="h-1 bg-[#171717]">
          <div
            className="h-full bg-gradient-to-r from-[#D4A574] to-[#E5C28C] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-10">
        <div className="w-full max-w-2xl">
          {step === 1 && (
            <>
              <HeroIntro />
              <StepCards
                eyebrow="Sobre tu propiedad"
                title="¿Qué tipo de propiedad quieres valorar?"
                subtitle="Selecciona una opción"
                options={TIPOS}
                selected={form.tipo_vivienda}
                onSelect={(v) => pickAndAdvance('tipo_vivienda', v, 2)}
              />
            </>
          )}

          {step === 2 && (
            <StepCards
              eyebrow="Ubicación"
              title="¿En qué zona está la propiedad?"
              subtitle="Compramos en Antequera y comarca"
              options={ZONAS}
              selected={form.ubicacion}
              onSelect={(v) => pickAndAdvance('ubicacion', v, 3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepDetails
              m2={form.m2}
              dormitorios={form.dormitorios}
              estado={form.estado_propiedad}
              error={error}
              calculating={calculating}
              onChange={(k, v) => update(k, v)}
              onContinue={continueToPrice}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <StepPrice
              tipo={form.tipo_vivienda}
              zona={form.ubicacion}
              estimate={priceEstimate}
              onContinue={continueToContact}
              onBack={() => setStep(3)}
            />
          )}

          {step === 5 && (
            <StepContact
              form={form}
              update={update}
              error={error}
              loading={loading}
              estimate={priceEstimate}
              onBack={() => setStep(4)}
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
// ============ Hero compacto sobre el paso 1 ============
function HeroIntro() {
  return (
    <div className="text-center mb-7 sm:mb-9 animate-[fadeIn_400ms_ease-out]">
      {/* Chip de Erik */}
      <div className="inline-flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-[#171717] border border-[#262626] mb-5">
        <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#3F3F46] shrink-0">
          <Image
            src="/erik.jpg"
            alt="Erik"
            fill
            priority
            sizes="28px"
            className="object-cover"
          />
        </div>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span className="text-xs font-medium text-white">
          Erik te atiende hoy
        </span>
      </div>

      <h1 className="text-[26px] sm:text-4xl font-bold tracking-tight leading-[1.12] mb-3 max-w-xl mx-auto">
        Calcula cuánto vale tu casa en{' '}
        <span className="bg-gradient-to-r from-[#D4A574] to-[#E5C28C] bg-clip-text text-transparent">
          Antequera
        </span>
      </h1>

      <p className="text-[14px] sm:text-base text-[#A1A1AA] leading-relaxed">
        Resultado en 60 segundos · Sin dar tu teléfono · 100% gratis
      </p>
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

// ============ Step 3: Detalles (m² + dormitorios + estado) ============
function StepDetails({
  m2,
  dormitorios,
  estado,
  error,
  calculating,
  onChange,
  onContinue,
  onBack,
}: {
  m2: string;
  dormitorios: string;
  estado: string;
  error: string | null;
  calculating: boolean;
  onChange: (k: 'm2' | 'dormitorios' | 'estado_propiedad', v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  if (calculating) {
    return (
      <div className="animate-[fadeIn_300ms_ease-out] py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#171717] border border-[#262626] mb-6">
          <Loader2 className="w-7 h-7 text-[#D4A574] animate-spin" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          Calculando tu valoración…
        </h2>
        <p className="text-[#A1A1AA] max-w-sm mx-auto">
          Comparando con propiedades vendidas en tu zona.
        </p>
      </div>
    );
  }

  const dormOpts = ['1', '2', '3', '4+'];

  return (
    <div className="animate-[slideIn_350ms_ease-out]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A574] mb-3">
        Características
      </p>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2 leading-tight">
        Cuéntanos sobre tu propiedad
      </h2>
      <p className="text-[#A1A1AA] mb-7">
        Para darte una valoración precisa.
      </p>

      <div className="space-y-6">
        {/* m² */}
        <div>
          <label className="block text-sm font-semibold text-[#FAFAFA] mb-1">
            ¿Cuántos metros tiene?
          </label>
          <p className="text-xs text-[#A1A1AA] mb-2">
            Aproximado, no hace falta exacto.
          </p>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={m2}
              onChange={(e) => {
                const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 4);
                onChange('m2', onlyDigits);
              }}
              placeholder="Ej: 85"
              className="dark-input dark-input-big pr-20 no-spin"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-base font-semibold text-[#A1A1AA]">
              m²
            </span>
          </div>
        </div>

        {/* Dormitorios */}
        <div>
          <label className="block text-sm font-semibold text-[#FAFAFA] mb-2">
            ¿Cuántos dormitorios?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {dormOpts.map((d) => {
              const sel = dormitorios === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChange('dormitorios', d)}
                  className={`py-3 rounded-xl border text-base font-semibold transition ${
                    sel
                      ? 'bg-[#D4A574] text-black border-[#D4A574]'
                      : 'bg-[#171717] text-[#FAFAFA] border-[#262626] hover:border-[#3F3F46]'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-semibold text-[#FAFAFA] mb-2">
            ¿Cómo está la propiedad?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ESTADOS.map((opt) => {
              const sel = estado === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange('estado_propiedad', opt.value)}
                  className={`flex items-center gap-3 text-left p-3.5 rounded-xl border transition ${
                    sel
                      ? 'bg-[#D4A574]/10 border-[#D4A574]'
                      : 'bg-[#171717] border-[#262626] hover:border-[#3F3F46]'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      sel ? 'bg-[#D4A574] text-black' : 'bg-[#262626] text-[#D4A574]'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-tight">
                      {opt.label}
                    </p>
                    {opt.hint && (
                      <p className="text-xs text-[#A1A1AA] mt-0.5 leading-tight">
                        {opt.hint}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={onContinue}
        className="mt-7 w-full inline-flex items-center justify-center gap-2 py-4 bg-[#D4A574] text-black rounded-xl font-semibold text-base hover:bg-[#E5C28C] transition shadow-[0_0_40px_rgba(212,165,116,0.25)]"
      >
        Ver mi valoración
        <ArrowRight className="w-4 h-4" />
      </button>

      <button
        onClick={onBack}
        type="button"
        className="mt-5 inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Atrás
      </button>
    </div>
  );
}

// ============ Step 4: Valoración revelada ============
function StepPrice({
  tipo,
  zona,
  estimate,
  onContinue,
  onBack,
}: {
  tipo: string;
  zona: string;
  estimate: { low: number; high: number } | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  const tipoLabel =
    TIPOS.find((t) => t.value === tipo)?.label.toLowerCase() || 'propiedad';

  return (
    <div className="animate-[slideIn_350ms_ease-out]">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-300">
          Valoración lista
        </span>
      </div>

      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2 leading-tight">
        Tu {tipoLabel} en {zona} está valorada en
      </h2>

      <div className="my-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1F1A14] via-[#171717] to-[#171717] border border-[#3F2D1F] relative overflow-hidden">
        {/* glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#D4A574]/10 rounded-full blur-3xl" />
        <div className="relative">
          {estimate ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#D4A574] to-[#E5C28C] bg-clip-text text-transparent">
                  {formatEUR(estimate.low)}
                </span>
                <span className="text-xl sm:text-2xl text-[#A1A1AA]">
                  –
                </span>
                <span className="text-3xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-[#D4A574] to-[#E5C28C] bg-clip-text text-transparent">
                  {formatEUR(estimate.high)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-3">
                Rango de valor de mercado orientativo, basado en operaciones recientes en la zona.
              </p>
            </>
          ) : (
            <p className="text-[#A1A1AA]">
              No pudimos calcular el rango. Pasa al siguiente paso y Erik te dará una valoración personalizada.
            </p>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#171717] border border-[#262626] mb-6">
        <p className="text-sm text-[#FAFAFA] leading-relaxed">
          <span className="text-[#D4A574] font-semibold">¿Quieres una oferta firme?</span>{' '}
          Erik te llama en menos de 24 horas con un precio en efectivo, sin reformas y sin comisiones.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="w-full inline-flex items-center justify-center gap-2 py-4 bg-[#D4A574] text-black rounded-xl font-semibold text-base hover:bg-[#E5C28C] transition shadow-[0_0_40px_rgba(212,165,116,0.25)]"
      >
        Quiero mi oferta firme
        <ArrowRight className="w-4 h-4" />
      </button>

      <button
        onClick={onBack}
        type="button"
        className="mt-5 inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Atrás
      </button>
    </div>
  );
}

// ============ Step contacto (paso 5) ============
function StepContact({
  form,
  update,
  error,
  loading,
  estimate,
  onBack,
  onSubmit,
}: {
  form: { nombre: string; telefono: string; tipo_vivienda: string; ubicacion: string; m2: string; dormitorios: string; estado_propiedad: string };
  update: (k: 'nombre' | 'telefono', v: string) => void;
  error: string | null;
  loading: boolean;
  estimate: { low: number; high: number } | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-[slideIn_350ms_ease-out]">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#D4A574] mb-3">
        Último paso
      </p>
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2 leading-tight">
        ¿A dónde te llamamos?
      </h2>
      <p className="text-[#A1A1AA] mb-6">
        Erik te contacta en menos de{' '}
        <strong className="text-white">24 horas</strong> con tu oferta firme en efectivo.
      </p>

      {estimate && (
        <div className="mb-6 p-3.5 rounded-xl bg-[#D4A574]/[0.06] border border-[#D4A574]/25 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#D4A574]/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#D4A574]" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#D4A574] font-semibold">
              Tu valoración estimada
            </p>
            <p className="text-sm font-semibold text-white">
              {formatEUR(estimate.low)} – {formatEUR(estimate.high)}
            </p>
          </div>
        </div>
      )}

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

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#D4A574]/[0.06] border border-[#D4A574]/20">
          <ShieldCheck className="w-4 h-4 text-[#D4A574] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#D4D4D8] leading-relaxed">
            Te llamo <strong className="text-white">una sola vez</strong> para
            darte la oferta. Sin agobios.
          </p>
        </div>

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
