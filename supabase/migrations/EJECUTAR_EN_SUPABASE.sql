-- =====================================================
-- PASO 1: EJECUTAR ESTE SQL EN SUPABASE
-- =====================================================
-- Ve a: https://supabase.com/dashboard/project/dvwpyjcmmtjybvtahcmr/sql
-- Copia TODO este archivo y pégalo en el editor
-- Haz clic en RUN

-- Crear tabla de configuración
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_system_config_updated_at 
BEFORE UPDATE ON system_config 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Insertar configuración con tus credenciales
INSERT INTO system_config (config_key, config_value, is_encrypted, description) VALUES
  ('twilio_account_sid', 'ACc3e5774a1190b865c73ad5e03c25f883', true, 'Twilio Account SID'),
  ('twilio_auth_token', '', true, 'Twilio Auth Token - INGRESAR EN LA UI'),
  ('twilio_whatsapp_number', 'whatsapp:+14155238886', false, 'Número de WhatsApp de Twilio'),
  ('default_recipient_whatsapp', 'whatsapp:+34604347363', false, 'Tu número de WhatsApp'),
  ('whatsapp_template_appointment', 'HXb5b62575e6e4ff6129ad7c8efe1f983e', false, 'Template de citas'),
  ('scraping_delay_min', '2000', false, 'Delay mínimo entre requests (ms)'),
  ('scraping_delay_max', '5000', false, 'Delay máximo entre requests (ms)'),
  ('scraping_max_concurrent', '3', false, 'Máximo de scrapers concurrentes')
ON CONFLICT (config_key) DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- Verificar que se creó correctamente
SELECT * FROM system_config ORDER BY config_key;
