-- ========================================
-- CREAR TABLA capture_filters EN SUPABASE
-- Ejecutar en: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new
-- ========================================

CREATE TABLE IF NOT EXISTS capture_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,
  operation_type VARCHAR(20) NOT NULL,
  property_type VARCHAR(50),
  city VARCHAR(255) NOT NULL,
  min_price INTEGER,
  max_price INTEGER,
  min_rooms INTEGER,
  min_surface INTEGER,
  is_active BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT false,
  filters JSONB,
  properties_found INTEGER DEFAULT 0,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_capture_filters_source ON capture_filters(source);
CREATE INDEX IF NOT EXISTS idx_capture_filters_is_active ON capture_filters(is_active);
CREATE INDEX IF NOT EXISTS idx_capture_filters_city ON capture_filters(city);

-- Habilitar RLS (Row Level Security)
ALTER TABLE capture_filters ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidades)
CREATE POLICY "Enable all operations for authenticated users" ON capture_filters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_capture_filters_updated_at ON capture_filters;
CREATE TRIGGER update_capture_filters_updated_at
    BEFORE UPDATE ON capture_filters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
