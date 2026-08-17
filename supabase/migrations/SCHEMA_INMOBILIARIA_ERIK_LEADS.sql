-- =====================================================
-- SCHEMA: Leads de Inmobiliaria Erik (Antequera)
-- Formulario de Valoración Gratuita y Oferta de Compra
-- =====================================================

CREATE TABLE IF NOT EXISTS inmobiliaria_erik_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contacto
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,

  -- Propiedad
  ubicacion TEXT NOT NULL,
  tipo_vivienda TEXT NOT NULL CHECK (
    tipo_vivienda IN ('casa_pueblo', 'piso', 'chalet', 'finca', 'otra')
  ),
  necesita_reforma TEXT NOT NULL CHECK (
    necesita_reforma IN ('si_bastante', 'un_poco', 'no_mucho', 'esta_bien')
  ),
  comentarios TEXT,

  -- Tracking
  source TEXT DEFAULT 'web',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip_address TEXT,
  user_agent TEXT,

  -- Estado interno
  estado TEXT DEFAULT 'nuevo' CHECK (
    estado IN ('nuevo', 'contactado', 'cualificado', 'descartado', 'cerrado')
  ),
  notas_internas TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ie_leads_created
  ON inmobiliaria_erik_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ie_leads_estado
  ON inmobiliaria_erik_leads(estado);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ie_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ie_leads_updated_at ON inmobiliaria_erik_leads;
CREATE TRIGGER trg_ie_leads_updated_at
  BEFORE UPDATE ON inmobiliaria_erik_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_ie_leads_updated_at();

-- RLS: solo service_role puede leer/escribir desde el cliente
ALTER TABLE inmobiliaria_erik_leads ENABLE ROW LEVEL SECURITY;

-- (Inserts/selects se hacen desde el server con SUPABASE_SERVICE_ROLE_KEY,
-- así que no se necesitan policies para anon)
