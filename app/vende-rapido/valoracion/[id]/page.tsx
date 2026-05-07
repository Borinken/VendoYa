'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TrendingUp, Home, Phone, Mail, MessageCircle, Check, Clock, Users } from 'lucide-react';

interface Valuation {
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  pricePerSqm: number;
  marketAnalysis: string;
  recommendations: string[];
  urgencyImpact: string;
}

interface Lead {
  id: string;
  address: string;
  city: string;
  property_type: string;
  urgent_situation: string;
  estimated_value: number;
  valuation_data: Valuation;
  name: string;
  phone: string;
  created_at: string;
}

export default function ValuationPage() {
  const params = useParams();
  const leadId = params.id as string;
  
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}`);
      if (response.ok) {
        const data = await response.json();
        setLead(data);
      }
    } catch (error) {
      console.error('Error fetching lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCall = async () => {
    setShowContactForm(true);
    
    // Registrar interacción
    await fetch(`/api/leads/${leadId}/interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'call_request',
        content: 'Usuario solicitó llamada desde página de valoración',
      }),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tu valoración...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Valoración no encontrada</h1>
          <p className="text-gray-600">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const valuation = lead.valuation_data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Vendoya</span>
          </div>
          <a
            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Contactar por WhatsApp</span>
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero - Valoración */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-3xl p-8 md:p-12 text-white mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-6 h-6" />
            <span className="font-semibold">Valoración completada</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ¡Hola {lead.name}! 👋
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-blue-50">
            Tu vivienda en {lead.city} está valorada en:
          </p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="text-center">
              <p className="text-lg mb-2 text-blue-100">Valor estimado</p>
              <p className="text-6xl md:text-7xl font-bold mb-4">
                {valuation.estimatedValue.toLocaleString('es-ES')}€
              </p>
              <p className="text-blue-100">
                Rango: {valuation.minValue.toLocaleString('es-ES')}€ - {valuation.maxValue.toLocaleString('es-ES')}€
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-blue-100 mb-1">Precio por m²</p>
              <p className="text-2xl font-bold">{valuation.pricePerSqm.toLocaleString('es-ES')}€</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-blue-100 mb-1">Tiempo estimado venta</p>
              <p className="text-2xl font-bold">30-60 días</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm text-blue-100 mb-1">Red de agencias</p>
              <p className="text-2xl font-bold">+500</p>
            </div>
          </div>
        </div>

        {/* Análisis del mercado */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Análisis del mercado
          </h2>
          <p className="text-gray-700 mb-6">{valuation.marketAnalysis}</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-bold text-yellow-900 mb-2">Impacto de tu situación:</h3>
            <p className="text-yellow-800">{valuation.urgencyImpact}</p>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Recomendaciones personalizadas</h2>
          <div className="space-y-4">
            {valuation.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-gray-700 pt-1">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA - Siguiente paso */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 md:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">¿Quieres vender al mejor precio?</h2>
          <p className="text-xl mb-8 text-blue-50">
            Nuestros expertos pueden conseguirte hasta un 15% más del valor estimado
          </p>

          {!showContactForm ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRequestCall}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Quiero que me llamen
              </button>
              
              <a
                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hola, he visto mi valoración y me gustaría más información`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Escribir por WhatsApp
              </a>
            </div>
          ) : (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 max-w-md mx-auto">
              <Check className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">¡Solicitud enviada!</h3>
              <p className="text-blue-100 mb-4">
                Uno de nuestros expertos te llamará en las próximas 2 horas.
              </p>
              <p className="text-sm text-blue-100">
                También te hemos enviado un mensaje por WhatsApp con toda la información.
              </p>
            </div>
          )}
        </div>

        {/* Detalles de la propiedad */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold mb-6">Detalles de tu solicitud</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Dirección</p>
              <p className="font-semibold">{lead.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Ciudad</p>
              <p className="font-semibold">{lead.city}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Tipo de propiedad</p>
              <p className="font-semibold capitalize">{lead.property_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Situación</p>
              <p className="font-semibold capitalize">{lead.urgent_situation}</p>
            </div>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">+1.200 propietarios han vendido con nosotros este año</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-yellow-400 text-2xl">★</span>
            ))}
            <span className="ml-2 text-gray-600 font-semibold">4.9/5 (834 opiniones)</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span>✓ Sin comisiones ocultas</span>
            <span>✓ Asesoramiento gratuito</span>
            <span>✓ Red de +500 agencias</span>
            <span>✓ Venta garantizada en 90 días</span>
          </div>
        </div>
      </div>
    </div>
  );
}
