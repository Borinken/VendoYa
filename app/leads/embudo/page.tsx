'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw,
  Loader2,
  TrendingDown,
  Users,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

interface Stage {
  step: string;
  label: string;
  count: number;
  pct: number;
}

interface FunnelData {
  days: number;
  total_sessions: number;
  funnel: Stage[];
}

const STORAGE_KEY = 'leads_admin_pwd';

export default function FunnelPage() {
  const [password, setPassword] = useState('');
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPassword(saved);
      void load(saved, days);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(pwd: string, d: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/inmobiliaria-erik-funnel?days=${d}`,
        {
          headers: { Authorization: `Bearer ${pwd}` },
          cache: 'no-store',
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error');
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  if (!password) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-xl font-bold mb-3">Embudo de conversión</h1>
          <p className="text-sm text-gray-500 mb-5">
            Inicia sesión primero en{' '}
            <Link href="/leads" className="text-emerald-600 underline">
              /leads
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a leads
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-lg font-bold text-gray-900">
              Embudo de conversión
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => {
                const d = parseInt(e.target.value, 10);
                setDays(d);
                void load(password, d);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="1">Hoy</option>
              <option value="3">Últimos 3 días</option>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
            </select>
            <button
              onClick={() => load(password, days)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading && !data ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
            {error}
          </div>
        ) : !data ? null : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <Stat
                label="Sesiones totales"
                value={data.total_sessions}
                icon={<Users className="w-4 h-4" />}
              />
              <Stat
                label="Leads enviados"
                value={
                  data.funnel.find((f) => f.step === 'submit_success')
                    ?.count || 0
                }
                accent
              />
              <Stat
                label="Tasa de conversión"
                value={`${
                  data.funnel.find((f) => f.step === 'submit_success')?.pct ||
                  0
                }%`}
                accent
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-900">
                  Embudo paso a paso
                </h2>
                <span className="text-xs text-gray-500">
                  Últimos {data.days} {data.days === 1 ? 'día' : 'días'}
                </span>
              </div>

              <div className="space-y-3">
                {data.funnel.map((stage, idx) => {
                  const next = data.funnel[idx + 1];
                  const drop = next ? stage.count - next.count : 0;
                  const dropPct =
                    stage.count && next
                      ? Math.round((drop / stage.count) * 100)
                      : 0;
                  return (
                    <div key={stage.step}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-800">
                          {stage.label}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {stage.count}{' '}
                          <span className="text-gray-400 font-normal">
                            ({stage.pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                          style={{ width: `${stage.pct}%` }}
                        />
                      </div>
                      {next && drop > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-rose-600">
                          <TrendingDown className="w-3 h-3" />
                          <span>
                            {drop} se fueron aquí ({dropPct}% drop)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              El tracking se inició al desplegar esta versión. Los visitantes
              previos no aparecen en estas estadísticas.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        accent
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {icon}
        {label}
      </div>
      <div
        className={`text-2xl font-bold ${
          accent ? 'text-emerald-700' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
