const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAlarmsTable() {
  console.log('🔧 Verificando tabla property_alarms...');
  
  // Verificar si la tabla existe consultándola
  const { data, error } = await supabase
    .from('property_alarms')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('⚠️  Tabla property_alarms no existe');
    console.log('');
    console.log('📋 SQL necesario:');
    console.log('----------------------------------------');
    console.log('Ve a: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
    console.log('');
    console.log('Ejecuta el archivo: ALARMAS_PROPIEDADES.sql');
    console.log('----------------------------------------');
    process.exit(1);
  } else if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Tabla property_alarms existe correctamente');
  process.exit(0);
}

createAlarmsTable();
