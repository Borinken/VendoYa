'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  Lock,
  Phone,
  MapPin,
  Calendar,
  Inbox,
  Loader2,
} from 'lucide-react';

interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  ubicacion: string;
  tipo_vivienda: string;
  necesita_reforma: string;
  comentarios: string | null;
  estado: string;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
  casa_pueblo: 'Casa de Pueblo',
  piso: 'Piso',
  chalet: 'Chalet',
  finca: 'Finca / Cortijo',
  otra: 'Otra',
};

const REFORMA_LABEL: Record<string, string> = {
  si_bastante: 'Sí, bastante',
  un_poco: 'Un poco',
  no_mucho: 'No mucho',
  esta_bien: 'Está bien',
};

const REFORMA_COLOR: Record<string, string> = {
  si_bastante: 'bg-red-100 text-red-700',
  un_poco: 'bg-amber-100 text-amber-700',
  no_mucho: 'bg-blue-100 text-blue-700',
  esta_bien: 'bg-emerald-100 text-emerald-700',
};

const STORAGE_KEY = 'leads_admin_pwd';

export default function LeadsAdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'casa_pueblo' | 'piso' | 'chalet' | 'finca' | 'otra'>('todos');

  // Cargar contraseña guardada
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPassword(saved);
      void loadLeads(saved);
    }
  }, []);

  async function loadLeads(pwd: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inmobiliaria-erik-leads', {
        headers: { Authorization: `Bearer ${pwd}` },
        cache: 'no-store',
      });
      if (res.status === 401) {
        setError('Contraseña incorrecta');
        setAuthed(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al cargar leads');
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setAuthed(true);
      localStorage.setItem(STORAGE_KEY, pwd);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = leads;
    if (filter !== 'todos') {
      list = list.filter((l) => l.tipo_vivienda === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.nombre.toLowerCase().includes(q) ||
          l.telefono.toLowerCase().includes(q) ||
          l.ubicacion.toLowerCase().includes(q) ||
          (l.comentarios || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, filter, search]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-emerald-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-5 mx-auto">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Panel de Leads
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Introduce la contraseña de administración
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password) void loadLeads(password);
            }}
            className="space-y-4"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              autoFocus
            />
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leads recibidos</h1>
            <p className="text-xs text-gray-500">
              {leads.length} totales · {filtered.length} filtrados
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadLeads(password)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
            <a
              href={`/api/inmobiliaria-erik-leads/export?key=${encodeURIComponent(
                password
              )}`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
            >
              <Download className="w-4 h-4" />
              Descargar CSV / Excel
            </a>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setAuthed(false);
                setPassword('');
                setLeads([]);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, ubicación..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {(['todos', 'piso', 'casa_pueblo', 'chalet', 'finca', 'otra'] as const).map(
              (opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    filter === opt
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt === 'todos' ? 'Todos' : TIPO_LABEL[opt] || opt}
                </button>
              )
            )}
          </div>
        </div>

        {/* Tabla */}
        {loading && leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {leads.length === 0
                ? 'Aún no hay leads recibidos.'
                : 'No hay resultados con los filtros actuales.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Reforma</th>
                    <th className="px-4 py-3">Comentarios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((l) => {
                    const date = new Date(l.created_at);
                    return (
                      <tr key={l.id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {date.toLocaleDateString('es-ES')}
                              <br />
                              <span className="text-xs text-gray-400">
                                {date.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {l.nombre}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://wa.me/${l.telefono.replace(
                              /\D/g,
                              ''
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {l.telefono}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>{l.ubicacion}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {TIPO_LABEL[l.tipo_vivienda] || l.tipo_vivienda}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                              REFORMA_COLOR[l.necesita_reforma] ||
                              'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {REFORMA_LABEL[l.necesita_reforma] ||
                              l.necesita_reforma}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-xs">
                          {l.comentarios || (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
