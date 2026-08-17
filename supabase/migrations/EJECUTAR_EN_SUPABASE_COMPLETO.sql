-- ========================================
-- EJECUTAR ESTE SQL EN SUPABASE
-- https://supabase.com/dashboard/project/dvwpyjcmmtjybvtahcmr/sql/new
-- ========================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuración
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
