-- Vendoya CRM - Database Schema
-- Ejecutar este script en Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLA: agencies (Agencias Inmobiliarias)
-- ========================================
CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  tax_id VARCHAR(50),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: users (Usuarios/Agentes)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'manager')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: contacts (Contactos/Leads)
-- ========================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) DEFAULT 'lead' CHECK (type IN ('lead', 'owner', 'buyer', 'tenant', 'landlord')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  tax_id VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  notes TEXT,
  lead_source VARCHAR(50),
  lead_status VARCHAR(20) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'negotiating', 'won', 'lost')),
  lead_score INTEGER DEFAULT 0,
  data_processing_consent BOOLEAN DEFAULT FALSE,
  data_processing_consent_date TIMESTAMP WITH TIME ZONE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  whatsapp_opt_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: properties (Propiedades)
-- ========================================
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  property_type VARCHAR(50) DEFAULT 'apartment' CHECK (property_type IN ('apartment', 'house', 'penthouse', 'duplex', 'studio', 'villa', 'townhouse', 'commercial', 'office', 'warehouse', 'land', 'garage', 'storage')),
  operation_type VARCHAR(20) DEFAULT 'sale' CHECK (operation_type IN ('sale', 'rent', 'both')),
  price DECIMAL(12, 2),
  monthly_rent DECIMAL(10, 2),
  surface DECIMAL(10, 2) NOT NULL,
  rooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  floor INTEGER,
  has_elevator BOOLEAN DEFAULT FALSE,
  condition VARCHAR(20) DEFAULT 'good' CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'to_renovate')),
  orientation VARCHAR(20) CHECK (orientation IN ('north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest')),
  views VARCHAR(20),
  year_built INTEGER,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  neighborhood VARCHAR(100),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  images TEXT[], -- Array de URLs
  features TEXT[], -- Array de características
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('draft', 'available', 'reserved', 'sold', 'rented', 'inactive')),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: contracts (Contratos)
-- ========================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contract_type VARCHAR(50) DEFAULT 'rental_urban' CHECK (contract_type IN ('rental_urban', 'rental_vacation', 'sale', 'reservation', 'option_to_buy')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'cancelled')),
  start_date DATE NOT NULL,
  end_date DATE,
  duration_months INTEGER,
  monthly_rent DECIMAL(10, 2),
  deposit DECIMAL(10, 2),
  sale_price DECIMAL(12, 2),
  commission_percentage DECIMAL(5, 2),
  commission_amount DECIMAL(10, 2),
  terms TEXT,
  template_used VARCHAR(100),
  signed_document_url TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: rentals (Gestión de Alquileres)
-- ========================================
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  next_payment_date DATE,
  last_payment_date DATE,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'late', 'failed')),
  overdue_days INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: incidents (Incidencias/Tickets)
-- ========================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES rentals(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'maintenance' CHECK (category IN ('maintenance', 'repair', 'cleaning', 'complaint', 'other')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  images TEXT[],
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: activities (Actividades)
-- ========================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) DEFAULT 'note' CHECK (activity_type IN ('call', 'email', 'meeting', 'whatsapp', 'note', 'viewing')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: capture_filters (Filtros de Captación)
-- ========================================
CREATE TABLE IF NOT EXISTS capture_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  portals JSONB DEFAULT '[]', -- Array de portales y configuración
  filters JSONB DEFAULT '{}', -- Filtros de búsqueda
  notification_channels JSONB DEFAULT '{}', -- Configuración de notificaciones
  check_frequency_minutes INTEGER DEFAULT 30,
  properties_found INTEGER DEFAULT 0,
  properties_notified INTEGER DEFAULT 0,
  last_check_at TIMESTAMP WITH TIME ZONE,
  last_property_found_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLA: captured_properties (Propiedades Capturadas)
-- ========================================
CREATE TABLE IF NOT EXISTS captured_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  filter_id UUID REFERENCES capture_filters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL, -- idealista, fotocasa, etc.
  source_id VARCHAR(255) NOT NULL,
  source_url TEXT NOT NULL,
  data JSONB NOT NULL, -- Datos completos de la propiedad
  match_score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'interested', 'contacted', 'imported', 'discarded')),
  notes TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- ========================================
-- INDICES para mejorar performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id);
CREATE INDEX IF NOT EXISTS idx_contacts_agency ON contacts(agency_id);
CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_properties_agency ON properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property ON contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_rentals_agency ON rentals(agency_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_incidents_rental ON incidents(rental_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_captured_properties_filter ON captured_properties(filter_id);
CREATE INDEX IF NOT EXISTS idx_captured_properties_status ON captured_properties(status);

-- ========================================
-- FUNCIONES para actualizar updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a todas las tablas
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_capture_filters_updated_at BEFORE UPDATE ON capture_filters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_captured_properties_updated_at BEFORE UPDATE ON captured_properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- TABLA: system_config (Configuración del Sistema)
-- ========================================
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DATOS DE PRUEBA (Opcional)
-- ========================================

-- Insertar agencia de prueba
INSERT INTO agencies (id, name, email, phone, website, city, primary_color)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vendoya Inmobiliaria',
  'info@vendoya.es',
  '+34 952 123 456',
  'https://vendoya.es',
  'Málaga',
  '#3B82F6'
) ON CONFLICT (email) DO NOTHING;

-- Insertar usuario admin de prueba
INSERT INTO users (id, agency_id, email, first_name, last_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'admin@vendoya.es',
  'Admin',
  'Vendoya',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insertar propiedades de ejemplo
INSERT INTO properties (
  agency_id,
  title,
  description,
  property_type,
  operation_type,
  price,
  monthly_rent,
  surface,
  rooms,
  bathrooms,
  address,
  city,
  neighborhood,
  postal_code,
  status,
  published,
  features
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Piso céntrico en Málaga',
  'Amplio piso de 3 habitaciones en el centro de Málaga, totalmente reformado',
  'apartment',
  'both',
  295000,
  1200,
  110,
  3,
  2,
  'Calle Larios, 15',
  'Málaga',
  'Centro',
  '29015',
  'available',
  true,
  ARRAY['ascensor', 'aire acondicionado', 'calefacción', 'balcón', 'reformado']
),
(
  '00000000-0000-0000-0000-000000000001',
  'Chalet en Antequera',
  'Precioso chalet independiente con piscina y jardín',
  'house',
  'sale',
  380000,
  null,
  250,
  4,
  3,
  'Urbanización Los Olivos, 23',
  'Antequera',
  'Los Olivos',
  '29200',
  'available',
  true,
  ARRAY['piscina', 'jardín', 'garaje', 'terraza', 'chimenea']
),
(
  '00000000-0000-0000-0000-000000000001',
  'Apartamento en primera línea de playa',
  'Espectacular apartamento con vistas al mar',
  'apartment',
  'rent',
  null,
  1800,
  85,
  2,
  2,
  'Paseo Marítimo, 100',
  'Marbella',
  'Puerto Banús',
  '29660',
  'available',
  true,
  ARRAY['vistas al mar', 'piscina comunitaria', 'parking', 'aire acondicionado']
) ON CONFLICT DO NOTHING;

-- Insertar contactos de ejemplo
INSERT INTO contacts (
  agency_id,
  type,
  first_name,
  last_name,
  email,
  phone,
  lead_source,
  lead_status,
  data_processing_consent
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'lead',
  'Juan',
  'García',
  'juan.garcia@example.com',
  '+34 666 111 222',
  'web',
  'new',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'owner',
  'María',
  'López',
  'maria.lopez@example.com',
  '+34 666 333 444',
  'referral',
  'won',
  true
),
(
  '00000000-0000-0000-0000-000000000001',
  'buyer',
  'Pedro',
  'Martínez',
  'pedro.martinez@example.com',
  '+34 666 555 666',
  'idealista',
  'negotiating',
  true
) ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
SELECT 'Base de datos Vendoya CRM creada exitosamente!' as mensaje;
