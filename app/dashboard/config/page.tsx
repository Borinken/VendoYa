'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Key, Shield, Zap, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface ConfigItem {
  config_key: string
  config_value: string
  is_encrypted: boolean
  description: string
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
      
      if (error) throw error

      const configMap: Record<string, string> = {}
      data?.forEach((item: ConfigItem) => {
        configMap[item.config_key] = item.config_value || ''
      })
      
      setConfigs(configMap)
    } catch (error) {
      console.error('Error cargando configuración:', error)
      showMessage('error', 'Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Actualizar cada configuración
      for (const [key, value] of Object.entries(configs)) {
        const { error } = await supabase
          .from('system_config')
          .upsert({
            config_key: key,
            config_value: value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_key'
          })

        if (error) throw error
      }

      showMessage('success', '✓ Configuración guardada correctamente')
    } catch (error) {
      console.error('Error guardando configuración:', error)
      showMessage('error', 'Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const toggleShowSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateConfig = (key: string, value: string) => {
    setConfigs(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Cargando configuración...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-emerald-500" />
                Configuración del Sistema
              </h1>
              <p className="text-gray-500 mt-1">
                Administra las credenciales y configuraciones de integración
              </p>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Mensaje de estado */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* WhatsApp / Twilio Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Key className="w-6 h-6" />
              Credenciales de WhatsApp (Twilio)
            </h2>
            <p className="text-emerald-50 text-sm mt-1">
              Obtén tus credenciales en <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">console.twilio.com</a>
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Twilio Account SID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Account SID *
              </label>
              <div className="relative">
                <input
                  type={showSecrets['twilio_account_sid'] ? 'text' : 'password'}
                  value={configs['twilio_account_sid'] || ''}
                  onChange={(e) => updateConfig('twilio_account_sid', e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('twilio_account_sid')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets['twilio_account_sid'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Identificador único de tu cuenta de Twilio</p>
            </div>

            {/* Twilio Auth Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twilio Auth Token *
              </label>
              <div className="relative">
                <input
                  type={showSecrets['twilio_auth_token'] ? 'text' : 'password'}
                  value={configs['twilio_auth_token'] || ''}
                  onChange={(e) => updateConfig('twilio_auth_token', e.target.value)}
                  placeholder="********************************"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => toggleShowSecret('twilio_auth_token')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showSecrets['twilio_auth_token'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Token de autenticación secreto de Twilio</p>
            </div>

            {/* Twilio WhatsApp Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de WhatsApp de Twilio *
              </label>
              <input
                type="text"
                value={configs['twilio_whatsapp_number'] || ''}
                onChange={(e) => updateConfig('twilio_whatsapp_number', e.target.value)}
                placeholder="whatsapp:+14155238886"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Formato: whatsapp:+14155238886 (incluir prefijo whatsapp:)</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">📘 ¿Cómo obtener las credenciales?</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Crea una cuenta gratuita en <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Twilio</a></li>
                <li>Ve a la consola y copia tu Account SID y Auth Token</li>
                <li>Activa WhatsApp Sandbox o compra un número de WhatsApp Business</li>
                <li>Pega las credenciales aquí y guarda</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Scraping Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Zap className="w-6 h-6" />
              Configuración de Captura (Anti-Detección)
            </h2>
            <p className="text-violet-50 text-sm mt-1">
              Ajusta los parámetros para evitar detección en el scraping
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Delay Mínimo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delay Mínimo (ms)
                </label>
                <input
                  type="number"
                  value={configs['scraping_delay_min'] || '2000'}
                  onChange={(e) => updateConfig('scraping_delay_min', e.target.value)}
                  min="1000"
                  max="10000"
                  step="500"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">Tiempo mínimo entre peticiones</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delay Máximo (ms)
                </label>
                <input
                  type="number"
                  value={configs['scraping_delay_max'] || '5000'}
                  onChange={(e) => updateConfig('scraping_delay_max', e.target.value)}
                  min="1000"
                  max="15000"
                  step="500"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">Tiempo máximo entre peticiones</p>
              </div>
            </div>

            {/* Max Concurrent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo de Scrapers Concurrentes
              </label>
              <input
                type="number"
                value={configs['scraping_max_concurrent'] || '3'}
                onChange={(e) => updateConfig('scraping_max_concurrent', e.target.value)}
                min="1"
                max="10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-gray-500 mt-1">Cuántos portales buscar al mismo tiempo (1-10)</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 text-sm mb-2">⚠️ Seguridad y Privacidad</h3>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                <li>Los delays aleatorios simulan comportamiento humano</li>
                <li>User-Agent rotation evita bloqueos por bot</li>
                <li>Modo headless mantiene el scraping invisible</li>
                <li>Solo para uso personal según TOS de cada portal</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white mb-8">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Seguridad de Datos
          </h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Las credenciales se almacenan de forma segura en tu base de datos Supabase</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Los campos sensibles están marcados como encriptados en la BD</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Nunca se exponen en el frontend excepto cuando las editas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400">✓</span>
              <span>El scraping usa técnicas anti-detección para privacidad</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
