'use client';

import { useState, useEffect } from 'react';
import { Loader2, Mail, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  active: boolean;
  last_check?: string;
}

export default function EmailConfigPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  // Cargar cuentas configuradas
  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/email/accounts');
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error al cargar cuentas:', err);
    }
  };

  // Iniciar flujo OAuth de Gmail
  const connectGmail = async () => {
    if (!email) {
      setError('Por favor ingresa tu email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Iniciar flujo OAuth
      const res = await fetch('/api/auth/gmail/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (data.authUrl) {
        // Abrir ventana de autorización
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const authWindow = window.open(
          data.authUrl,
          'Gmail Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Escuchar mensaje de callback
        const messageHandler = async (event: MessageEvent) => {
          if (event.data.type === 'gmail-auth-success') {
            window.removeEventListener('message', messageHandler);
            authWindow?.close();
            
            setEmail('');
            await loadAccounts();
            
            alert('✅ Gmail conectado exitosamente!');
          } else if (event.data.type === 'gmail-auth-error') {
            window.removeEventListener('message', messageHandler);
            authWindow?.close();
            setError(event.data.error || 'Error al conectar Gmail');
          }
        };

        window.addEventListener('message', messageHandler);
      } else {
        setError(data.error || 'Error al iniciar OAuth');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar Gmail');
    } finally {
      setLoading(false);
    }
  };

  // Desconectar cuenta
  const disconnectAccount = async (accountId: string) => {
    if (!confirm('¿Estás seguro de desconectar esta cuenta?')) return;

    try {
      await fetch(`/api/email/accounts/${accountId}`, {
        method: 'DELETE'
      });
      
      await loadAccounts();
      alert('Cuenta desconectada');
    } catch {
      alert('Error al desconectar cuenta');
    }
  };

  // Sincronizar manualmente
  const syncNow = async (accountId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/email/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      const data = await res.json();
      alert(`✅ Sincronizado: ${data.processed || 0} emails procesados`);
      await loadAccounts();
    } catch {
      alert('Error al sincronizar');
    } finally {
      setLoading(false);
    }
  };

  // Cargar cuentas al montar
  useEffect(() => {
    loadAccounts();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración de Email</h1>
        <p className="text-gray-600 mt-2">
          Conecta tu cuenta de Gmail para recibir leads automáticamente
        </p>
      </div>

      {/* Cuentas configuradas */}
      {accounts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cuentas Conectadas</h2>
          <p className="text-sm text-gray-600 mb-4">
            Estas cuentas están sincronizando emails automáticamente
          </p>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{account.email}</p>
                    <p className="text-sm text-gray-500">
                      {account.provider} • {account.active ? '✅ Activa' : '❌ Inactiva'}
                    </p>
                    {account.last_check && (
                      <p className="text-xs text-gray-400">
                        Última sincronización: {new Date(account.last_check).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => syncNow(account.id)}
                    disabled={loading}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sincronizar
                  </button>
                  <button
                    onClick={() => disconnectAccount(account.id)}
                    className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Desconectar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conectar nueva cuenta */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Conectar Gmail</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ingresa tu email de Gmail para comenzar a recibir leads automáticamente
        </p>
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email de Gmail
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu-email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:bg-gray-50"
            />
            <p className="text-sm text-gray-500">
              Este email recibirá notificaciones de Idealista, Fotocasa, etc.
            </p>
          </div>

          <button
            onClick={connectGmail}
            disabled={loading || !email}
            className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Conectar Gmail
              </>
            )}
          </button>
        </div>
      </div>

      {/* Información */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg border border-emerald-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">¿Cómo funciona?</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">1. Conecta tu Gmail</p>
              <p className="text-gray-600">Autoriza el acceso a tu cuenta de Gmail de forma segura</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">2. Recibe notificaciones</p>
              <p className="text-gray-600">Idealista, Fotocasa y otros portales envían emails a tu cuenta</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">3. Extracción automática</p>
              <p className="text-gray-600">La IA extrae contactos, teléfonos y detalles automáticamente</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">4. Leads en tu CRM</p>
              <p className="text-gray-600">Los contactos aparecen automáticamente listos para seguimiento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
