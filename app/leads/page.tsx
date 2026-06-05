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
  CheckCircle2,
  Undo2,
  UserCheck,
} from 'lucide-react';

interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  ubicacion: string;
  tipo_vivienda: string;
  necesita_reforma: string | null;
  comentarios: string | null;
  estado: string;
  atendido_por: string | null;
  atendido_at: string | null;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
  casa_pueblo: 'Casa',
  piso: 'Piso',
  chalet: 'Chalet',
  finca: 'Finca / Cortijo',
  otra: 'Otro',
};

const STORAGE_KEY = 'leads_admin_pwd';
const USER_KEY = 'leads_admin_user';

type Tab = 'nuevos' | 'historial';

export default function LeadsAdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('nuevos');
  const [currentUser, setCurrentUser] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Cargar contraseña + usuario
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(STORAGE_KEY);
    const user = localStorage.getItem(USER_KEY);
    if (user) setCurrentUser(user);
    if (saved) {
      setPassword(saved);
      void loadLeads(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUser) localStorage.setItem(USER_KEY, currentUser);
  }, [currentUser]);

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

  async function marcarAtendido(lead: Lead) {
    const who =
      currentUser.trim() ||
      window.prompt(
        '¿Quién atiende este lead? (ej: Erik, María...)'
      )?.trim() ||
      '';
    if (!who) return;
    setCurrentUser(who);

    setUpdatingId(lead.id);
    try {
      const res = await fetch('/api/inmobiliaria-erik-leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          id: lead.id,
          estado: 'contactado',
          atendido_por: who,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? data.lead : l)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setUpdatingId(null);
    }
  }

  async function devolverANuevos(lead: Lead) {
    setUpdatingId(lead.id);
    try {
      const res = await fetch('/api/inmobiliaria-erik-leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          id: lead.id,
          estado: 'nuevo',
          atendido_por: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? data.lead : l)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setUpdatingId(null);
    }
  }

  const nuevos = useMemo(
    () => leads.filter((l) => l.estado === 'nuevo'),
    [leads]
  );
  const historial = useMemo(
    () => leads.filter((l) => l.estado !== 'nuevo'),
    [leads]
  );
  const sourceList = tab === 'nuevos' ? nuevos : historial;

  const filtered = useMemo(() => {
    if (!search.trim()) return sourceList;
    const q = search.toLowerCase();
    return sourceList.filter(
      (l) =>
        l.nombre.toLowerCase().includes(q) ||
        l.telefono.toLowerCase().includes(q) ||
        l.ubicacion.toLowerCase().includes(q) ||
        (l.atendido_por || '').toLowerCase().includes(q)
    );
  }, [sourceList, search]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="bg-[#171717] border border-[#262626] rounded-2xl p-8 w-full max-w-md">
          <div className="w-14 h-14 bg-gradient-to-br from-[#D4A574] to-[#A87B4B] rounded-2xl flex items-center justify-center mb-5 mx-auto">
            <Lock className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-[#FAFAFA] text-center mb-2">
            Panel de Leads
          </h1>
          <p className="text-sm text-[#A1A1AA] text-center mb-6">
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
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#262626] rounded-xl text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20"
              autoFocus
            />
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 bg-[#D4A574] text-black rounded-xl font-semibold hover:bg-[#E5C28C] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA]">
      <header className="bg-[#0F0F0F] border-b border-[#1F1F1F] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[#FAFAFA]">Leads recibidos</h1>
            <p className="text-xs text-[#A1A1AA]">
              {nuevos.length} nuevos · {historial.length} en historial
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[#171717] border border-[#262626] rounded-lg">
              <UserCheck className="w-4 h-4 text-[#71717A]" />
              <input
                type="text"
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                placeholder="Tu nombre"
                className="bg-transparent outline-none text-sm w-28 text-[#FAFAFA] placeholder:text-[#52525B]"
              />
            </div>

            <button
              onClick={() => loadLeads(password)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#171717] border border-[#262626] rounded-lg text-sm text-[#D4D4D8] hover:bg-[#1F1F1F] hover:border-[#3F3F46] disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
              Actualizar
            </button>
            <a
              href="/leads/embudo"
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#171717] border border-[#262626] rounded-lg text-sm text-[#D4D4D8] hover:bg-[#1F1F1F] hover:border-[#3F3F46]"
            >
              📊 Embudo
            </a>
            <a
              href={`/api/inmobiliaria-erik-leads/export?key=${encodeURIComponent(
                password
              )}`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#D4A574] text-black rounded-lg text-sm font-medium hover:bg-[#E5C28C]"
            >
              <Download className="w-4 h-4" />
              CSV / Excel
            </a>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setAuthed(false);
                setPassword('');
                setLeads([]);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-[#A1A1AA] hover:text-white"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 border-t border-[#1F1F1F]">
          <TabBtn
            active={tab === 'nuevos'}
            onClick={() => setTab('nuevos')}
            label="Nuevos"
            count={nuevos.length}
          />
          <TabBtn
            active={tab === 'historial'}
            onClick={() => setTab('historial')}
            label="Historial"
            count={historial.length}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-[#171717] rounded-xl border border-[#262626] p-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono, ubicación, atendido por..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#D4A574] focus:ring-2 focus:ring-[#D4A574]/20 text-sm"
            />
          </div>
        </div>

        {loading && leads.length === 0 ? (
          <div className="bg-[#171717] rounded-xl border border-[#262626] p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A574] mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#171717] rounded-xl border border-[#262626] p-16 text-center">
            <Inbox className="w-12 h-12 text-[#3F3F46] mx-auto mb-3" />
            <p className="text-[#A1A1AA]">
              {tab === 'nuevos'
                ? '¡Todo al día! No hay leads nuevos pendientes.'
                : 'Aún no hay leads en el historial.'}
            </p>
          </div>
        ) : (
          <div className="bg-[#171717] rounded-xl border border-[#262626] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#0F0F0F] border-b border-[#262626]">
                  <tr className="text-left text-xs font-semibold text-[#A1A1AA] uppercase">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Zona</th>
                    <th className="px-4 py-3">Tipo</th>
                    {tab === 'historial' && (
                      <th className="px-4 py-3">Atendido por</th>
                    )}
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filtered.map((l) => {
                    const date = new Date(l.created_at);
                    const atDate = l.atendido_at
                      ? new Date(l.atendido_at)
                      : null;
                    const isUpdating = updatingId === l.id;
                    return (
                      <tr key={l.id} className="hover:bg-[#1C1C1C] align-top">
                        <td className="px-4 py-3 whitespace-nowrap text-[#A1A1AA]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                            <span>
                              {date.toLocaleDateString('es-ES')}
                              <br />
                              <span className="text-xs text-[#71717A]">
                                {date.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#FAFAFA]">
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
                            className="inline-flex items-center gap-1 text-[#D4A574] hover:text-[#E5C28C] font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {l.telefono}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-[#D4D4D8]">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#71717A] mt-0.5 flex-shrink-0" />
                            <span>{l.ubicacion}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2.5 py-1 bg-[#262626] text-[#D4D4D8] rounded-full text-xs font-medium">
                            {TIPO_LABEL[l.tipo_vivienda] || l.tipo_vivienda}
                          </span>
                        </td>
                        {tab === 'historial' && (
                          <td className="px-4 py-3 text-[#D4D4D8]">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {l.atendido_por || '—'}
                              </span>
                              {atDate && (
                                <span className="text-xs text-[#71717A]">
                                  {atDate.toLocaleDateString('es-ES')}{' '}
                                  {atDate.toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          {tab === 'nuevos' ? (
                            <button
                              onClick={() => marcarAtendido(l)}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D4A574] text-black text-xs font-semibold rounded-lg hover:bg-[#E5C28C] disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Marcar atendido
                            </button>
                          ) : (
                            <button
                              onClick={() => devolverANuevos(l)}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262626] border border-[#3F3F46] text-[#D4D4D8] text-xs font-medium rounded-lg hover:bg-[#2F2F2F] disabled:opacity-60"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Undo2 className="w-3.5 h-3.5" />
                              )}
                              Devolver
                            </button>
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

function TabBtn({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-3 text-sm font-semibold transition ${
        active
          ? 'text-[#D4A574] border-b-2 border-[#D4A574] -mb-px'
          : 'text-[#A1A1AA] hover:text-white'
      }`}
    >
      {label}
      <span
        className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs ${
          active
            ? 'bg-[#D4A574]/15 text-[#D4A574]'
            : 'bg-[#262626] text-[#A1A1AA]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
