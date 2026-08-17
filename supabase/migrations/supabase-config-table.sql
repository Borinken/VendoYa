-- Ejecutar esto en Supabase SQL Editor para crear la tabla de configuración

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

-- Insertar configuraciones por defecto
INSERT INTO system_config (config_key, config_value, is_encrypted, description) VALUES
  ('whatsapp_api_provider', 'twilio', false, 'Proveedor de API de WhatsApp (twilio, whatsapp-business, etc)'),
  ('twilio_account_sid', '', true, 'Twilio Account SID'),
  ('twilio_auth_token', '', true, 'Twilio Auth Token'),
  ('twilio_whatsapp_number', '', false, 'Número de WhatsApp de Twilio (formato: whatsapp:+14155238886)'),
  ('scraping_user_agents', '["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36","Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"]', false, 'User agents para rotación'),
  ('scraping_delay_min', '2000', false, 'Delay mínimo entre requests (ms)'),
  ('scraping_delay_max', '5000', false, 'Delay máximo entre requests (ms)'),
  ('scraping_max_concurrent', '3', false, 'Máximo de scrapers concurrentes'),
  ('proxy_enabled', 'false', false, 'Usar proxies para scraping'),
  ('proxy_list', '[]', false, 'Lista de proxies en formato JSON')
ON CONFLICT (config_key) DO NOTHING;
