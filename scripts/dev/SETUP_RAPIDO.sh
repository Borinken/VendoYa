#!/bin/bash

echo "🚀 CONFIGURACIÓN AUTOMÁTICA DE VENDOYA CRM"
echo "=========================================="
echo ""
echo "📋 Paso 1: Abriendo Supabase SQL Editor..."
open "https://supabase.com/dashboard/project/dvwpyjcmmtjybvtahcmr/sql/new"

echo ""
echo "📝 COPIA Y PEGA ESTE SQL EN SUPABASE:"
echo "------------------------------------"
cat << 'EOF'
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_config (config_key, config_value, is_encrypted, description) VALUES
('twilio_account_sid', 'ACc3e5774a1190b865c73ad5e03c25f883', true, 'Twilio Account SID'),
('twilio_auth_token', '', true, 'Twilio Auth Token - INGRESAR EN LA UI'),
('twilio_whatsapp_number', 'whatsapp:+14155238886', false, 'Número de WhatsApp de Twilio'),
('default_recipient_whatsapp', 'whatsapp:+34604347363', false, 'Tu número de WhatsApp'),
('whatsapp_template_appointment', 'HXb5b62575e6e4ff6129ad7c8efe1f983e', false, 'Template de citas'),
('scraping_delay_min', '2000', false, 'Delay mínimo entre requests (ms)'),
('scraping_delay_max', '5000', false, 'Delay máximo entre requests (ms)'),
('scraping_max_concurrent', '3', false, 'Máximo de scrapers concurrentes')
ON CONFLICT (config_key) DO NOTHING;
EOF

echo "------------------------------------"
echo ""
echo "⏸️  Presiona ENTER después de ejecutar el SQL en Supabase..."
read -r

echo ""
echo "✅ ¡LISTO! Tu CRM está configurado."
echo ""
echo "🌐 Accede aquí:"
echo "   https://vendoya-hwxuip8lq-borinkens-projects.vercel.app"
echo ""
echo "🔑 Ve a Configuración y agrega tu Twilio Auth Token:"
echo "   https://vendoya-hwxuip8lq-borinkens-projects.vercel.app/dashboard/config"
echo ""
echo "🎉 ¡A PROBAR EL SISTEMA!"
