-- ========================================
-- TABLA: property_alarms (Alarmas de Propiedades)
-- ========================================
CREATE TABLE IF NOT EXISTS property_alarms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID,
  name VARCHAR(255) NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  notify_whatsapp BOOLEAN DEFAULT TRUE,
  whatsapp_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_alarms_active ON property_alarms(is_active);
CREATE INDEX IF NOT EXISTS idx_property_alarms_user ON property_alarms(user_id);

CREATE TRIGGER update_property_alarms_updated_at 
BEFORE UPDATE ON property_alarms 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar configuración de sincronización automática
INSERT INTO system_config (config_key, config_value, is_encrypted, description) VALUES
('auto_sync_properties', 'false', false, 'Sincronización automática de propiedades'),
('sync_interval_minutes', '30', false, 'Intervalo de sincronización en minutos')
ON CONFLICT (config_key) DO NOTHING;
