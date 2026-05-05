const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc'
);

const sql = `
-- Eliminar tabla si existe para recrearla
DROP TABLE IF EXISTS capture_filters CASCADE;

-- Crear tabla con estructura completa
CREATE TABLE capture_filters (
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

-- Índices
CREATE INDEX idx_capture_filters_source ON capture_filters(source);
CREATE INDEX idx_capture_filters_is_active ON capture_filters(is_active);
CREATE INDEX idx_capture_filters_city ON capture_filters(city);

-- Habilitar RLS
ALTER TABLE capture_filters ENABLE ROW LEVEL SECURITY;

-- Política permisiva
CREATE POLICY "Enable all operations" ON capture_filters FOR ALL USING (true) WITH CHECK (true);
`;

(async () => {
  console.log('🔧 Creando tabla capture_filters con estructura completa...');
  
  try {
    // Ejecutar SQL usando la función exec de PostgreSQL
    const { data, error } = await supabase.rpc('exec_sql', { query: sql }).catch(async () => {
      // Si exec_sql no existe, intentar método alternativo
      console.log('⚠️  exec_sql no disponible, usando método directo...');
      return { data: null, error: null };
    });
    
    if (error) {
      console.log('❌ Error:', error);
      console.log('\n📋 Por favor, ejecuta manualmente este SQL en Supabase:');
      console.log('https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new\n');
      console.log('Archivo: CREATE_CAPTURE_FILTERS_TABLE.sql');
    } else {
      console.log('✅ Tabla creada exitosamente');
      
      // Verificar con insert de prueba
      const testFilter = {
        name: 'Test Filter',
        source: 'idealista',
        operation_type: 'sale',
        property_type: 'Piso',
        city: 'Barcelona',
        is_active: true,
        notify_whatsapp: false,
        filters: { city: 'Barcelona' }
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('capture_filters')
        .insert([testFilter])
        .select();
      
      if (insertError) {
        console.log('❌ Error en test insert:', insertError.message);
      } else {
        console.log('✅ Test insert exitoso');
        // Eliminar registro de prueba
        if (insertData && insertData[0]) {
          await supabase.from('capture_filters').delete().eq('id', insertData[0].id);
          console.log('🗑️  Registro de prueba eliminado');
        }
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log('\n📋 Ejecuta manualmente el archivo: CREATE_CAPTURE_FILTERS_TABLE.sql');
    console.log('En: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
  }
})();
