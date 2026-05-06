-- =====================================================
-- SISTEMA DE INTEGRACIÓN DE EMAIL
-- =====================================================

-- Tabla para registrar emails procesados
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_email TEXT NOT NULL,
  to_email TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT CHECK (source IN ('idealista', 'fotocasa', 'realadvisor', 'habitaclia', 'owner', 'buyer', 'unknown')),
  type TEXT CHECK (type IN ('lead_buyer', 'lead_seller', 'property_inquiry', 'owner_contact', 'general')),
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  
  -- Relaciones
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  
  -- Datos parseados
  parsed_data JSONB,
  
  -- Estado de procesamiento
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para tareas/seguimientos
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  
  -- Fechas
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Relaciones
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Origen de la tarea
  created_from TEXT CHECK (created_from IN ('manual', 'email', 'automation', 'integration')),
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para configuración de cuentas de email
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  provider TEXT CHECK (provider IN ('gmail', 'outlook', 'imap')) NOT NULL,
  
  -- Credenciales (encriptadas en aplicación)
  credentials JSONB,
  
  -- Configuración
  auto_process BOOLEAN DEFAULT true,
  check_interval_minutes INTEGER DEFAULT 15,
  
  -- Estado
  active BOOLEAN DEFAULT true,
  last_check TIMESTAMPTZ,
  last_error TEXT,
  
  -- Metadatos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_email_logs_contact ON email_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_property ON email_logs(property_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_source ON email_logs(source);
CREATE INDEX IF NOT EXISTS idx_email_logs_processed ON email_logs(processed);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property ON tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(active);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_email_logs_updated_at ON email_logs;
CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON email_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER update_email_accounts_updated_at BEFORE UPDATE ON email_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para emails pendientes de procesar
CREATE OR REPLACE VIEW pending_emails AS
SELECT 
  el.*,
  c.first_name || ' ' || c.last_name AS contact_name,
  p.title AS property_title
FROM email_logs el
LEFT JOIN contacts c ON el.contact_id = c.id
LEFT JOIN properties p ON el.property_id = p.id
WHERE el.processed = false
ORDER BY el.created_at DESC;

-- Vista para tareas pendientes con información completa
CREATE OR REPLACE VIEW pending_tasks AS
SELECT 
  t.*,
  c.first_name || ' ' || c.last_name AS contact_name,
  c.email AS contact_email,
  c.phone AS contact_phone,
  p.title AS property_title,
  p.address AS property_address
FROM tasks t
LEFT JOIN contacts c ON t.contact_id = c.id
LEFT JOIN properties p ON t.property_id = p.id
WHERE t.status = 'pending'
ORDER BY 
  CASE t.priority
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  t.due_date ASC NULLS LAST;

-- Función para marcar tarea como completada
CREATE OR REPLACE FUNCTION complete_task(task_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE tasks 
  SET status = 'completed', completed_at = NOW()
  WHERE id = task_uuid;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de emails
CREATE OR REPLACE FUNCTION get_email_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_emails BIGINT,
  processed_emails BIGINT,
  pending_emails BIGINT,
  high_priority BIGINT,
  leads_created BIGINT,
  tasks_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_emails,
    COUNT(*) FILTER (WHERE processed = true)::BIGINT AS processed_emails,
    COUNT(*) FILTER (WHERE processed = false)::BIGINT AS pending_emails,
    COUNT(*) FILTER (WHERE priority = 'high')::BIGINT AS high_priority,
    COUNT(DISTINCT contact_id) FILTER (WHERE contact_id IS NOT NULL)::BIGINT AS leads_created,
    (SELECT COUNT(*)::BIGINT FROM tasks WHERE created_from = 'email' AND created_at >= NOW() - (days_back || ' days')::INTERVAL) AS tasks_created
  FROM email_logs
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Habilitar Row Level Security (RLS)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir todo para usuarios autenticados)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON email_logs;
CREATE POLICY "Allow all for authenticated users" ON email_logs
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON tasks;
CREATE POLICY "Allow all for authenticated users" ON tasks
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON email_accounts;
CREATE POLICY "Allow all for authenticated users" ON email_accounts
  FOR ALL USING (true);

-- Comentarios
COMMENT ON TABLE email_logs IS 'Registro de emails recibidos y procesados automáticamente';
COMMENT ON TABLE tasks IS 'Tareas y recordatorios de seguimiento';
COMMENT ON TABLE email_accounts IS 'Configuración de cuentas de email para monitoreo automático';

COMMENT ON COLUMN email_logs.parsed_data IS 'Datos extraídos del email mediante IA (JSON)';
COMMENT ON COLUMN tasks.created_from IS 'Origen de la tarea: manual, email, automation, integration';
COMMENT ON COLUMN email_accounts.credentials IS 'Credenciales encriptadas para acceso a cuenta de email';
