-- ============================================
-- SCHEMA PARA FUNNEL DE CAPTACIÓN VENDOYA
-- Propietarios con situaciones urgentes
-- ============================================

-- Tabla principal de leads
CREATE TABLE urgent_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Información de la propiedad
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  property_type TEXT, -- piso, casa, local, etc.
  
  -- Situación urgente
  urgent_situation TEXT NOT NULL, -- herencia, divorcio, embargo, ruina, mudanza, etc.
  situation_details TEXT,
  
  -- Fotos subidas
  photos JSONB, -- Array de URLs de fotos
  
  -- Valoración automática
  estimated_value DECIMAL(10,2),
  valuation_data JSONB, -- Datos detallados de la valoración
  
  -- Información de contacto
  phone TEXT,
  email TEXT,
  name TEXT,
  
  -- Tracking
  source TEXT, -- facebook, google, instagram, linkedin
  utm_campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  
  -- Estado del lead
  status TEXT DEFAULT 'nuevo', -- nuevo, contactado, calificado, reunión, propuesta, cerrado, descartado
  priority TEXT DEFAULT 'alta', -- alta, media, baja
  
  -- Seguimiento automático
  follow_up_day_1_sent BOOLEAN DEFAULT false,
  follow_up_day_3_sent BOOLEAN DEFAULT false,
  follow_up_day_7_sent BOOLEAN DEFAULT false,
  last_follow_up_at TIMESTAMP WITH TIME ZONE,
  
  -- Asignación
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Integración con CRM principal
  contact_id UUID REFERENCES contacts(id),
  property_id UUID REFERENCES properties(id)
);

-- Índices para performance
CREATE INDEX idx_urgent_leads_status ON urgent_leads(status);
CREATE INDEX idx_urgent_leads_created ON urgent_leads(created_at DESC);
CREATE INDEX idx_urgent_leads_assigned ON urgent_leads(assigned_to);
CREATE INDEX idx_urgent_leads_phone ON urgent_leads(phone);
CREATE INDEX idx_urgent_leads_follow_up ON urgent_leads(follow_up_day_1_sent, follow_up_day_3_sent, follow_up_day_7_sent);

-- Tabla de interacciones/seguimiento
CREATE TABLE lead_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES urgent_leads(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- call, whatsapp, email, sms, meeting, note
  direction TEXT, -- inbound, outbound
  
  content TEXT,
  metadata JSONB,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lead_interactions_lead ON lead_interactions(lead_id, created_at DESC);

-- Tabla de mensajes automáticos programados
CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES urgent_leads(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- whatsapp, email, sms
  template TEXT NOT NULL, -- day_1, day_3, day_7, custom
  
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  
  content TEXT,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduled_messages_pending ON scheduled_messages(scheduled_for) 
  WHERE status = 'pending';

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_urgent_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_urgent_leads_updated_at
  BEFORE UPDATE ON urgent_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_urgent_leads_updated_at();

-- Función para auto-asignar leads según ronda robin
CREATE OR REPLACE FUNCTION auto_assign_lead()
RETURNS TRIGGER AS $$
DECLARE
  next_agent UUID;
BEGIN
  -- Buscar agente con menos leads asignados
  SELECT u.id INTO next_agent
  FROM auth.users u
  LEFT JOIN urgent_leads l ON l.assigned_to = u.id
  WHERE u.role = 'agent' -- Asumiendo que tienes roles
  GROUP BY u.id
  ORDER BY COUNT(l.id) ASC
  LIMIT 1;
  
  IF next_agent IS NOT NULL THEN
    NEW.assigned_to = next_agent;
    NEW.assigned_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-asignación (opcional, descomentarlo si lo quieres)
-- CREATE TRIGGER trigger_auto_assign_lead
--   BEFORE INSERT ON urgent_leads
--   FOR EACH ROW
--   WHEN (NEW.assigned_to IS NULL)
--   EXECUTE FUNCTION auto_assign_lead();

-- Vista para dashboard de leads urgentes
CREATE OR REPLACE VIEW urgent_leads_dashboard AS
SELECT 
  ul.*,
  u.email as assigned_agent_email,
  COUNT(li.id) as interactions_count,
  MAX(li.created_at) as last_interaction_at,
  CASE 
    WHEN ul.created_at > NOW() - INTERVAL '24 hours' THEN 'nuevo'
    WHEN ul.created_at > NOW() - INTERVAL '72 hours' THEN 'reciente'
    ELSE 'antiguo'
  END as age_category
FROM urgent_leads ul
LEFT JOIN auth.users u ON u.id = ul.assigned_to
LEFT JOIN lead_interactions li ON li.lead_id = ul.id
GROUP BY ul.id, u.email;

-- Función para obtener estadísticas del funnel
CREATE OR REPLACE FUNCTION get_funnel_stats(days_back INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', COUNT(*),
    'leads_with_phone', COUNT(*) FILTER (WHERE phone IS NOT NULL),
    'conversion_rate', ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2),
    'avg_estimated_value', ROUND(AVG(estimated_value), 2),
    'by_situation', (
      SELECT jsonb_object_agg(urgent_situation, count)
      FROM (
        SELECT urgent_situation, COUNT(*) as count
        FROM urgent_leads
        WHERE created_at > NOW() - INTERVAL '1 day' * days_back
        GROUP BY urgent_situation
      ) situations
    ),
    'by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM urgent_leads
        WHERE created_at > NOW() - INTERVAL '1 day' * days_back
        GROUP BY status
      ) statuses
    ),
    'by_source', (
      SELECT jsonb_object_agg(COALESCE(source, 'directo'), count)
      FROM (
        SELECT source, COUNT(*) as count
        FROM urgent_leads
        WHERE created_at > NOW() - INTERVAL '1 day' * days_back
        GROUP BY source
      ) sources
    )
  ) INTO stats
  FROM urgent_leads
  WHERE created_at > NOW() - INTERVAL '1 day' * days_back;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) - Básico
ALTER TABLE urgent_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios autenticados pueden ver todos los leads
CREATE POLICY "Authenticated users can view all urgent leads"
  ON urgent_leads FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Los usuarios pueden crear leads (para el formulario público)
CREATE POLICY "Anyone can create urgent leads"
  ON urgent_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Solo asignados o admins pueden actualizar
CREATE POLICY "Assigned agents can update their leads"
  ON urgent_leads FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Comentarios para documentación
COMMENT ON TABLE urgent_leads IS 'Leads capturados del funnel de propietarios con situaciones urgentes';
COMMENT ON COLUMN urgent_leads.urgent_situation IS 'Tipo de situación urgente: herencia, divorcio, embargo, ruina, mudanza, liquidez, etc.';
COMMENT ON COLUMN urgent_leads.estimated_value IS 'Valoración automática generada por IA en euros';
COMMENT ON COLUMN urgent_leads.photos IS 'Array JSON con URLs de fotos subidas por el propietario';
COMMENT ON COLUMN urgent_leads.status IS 'Estado del lead en el pipeline de ventas';
