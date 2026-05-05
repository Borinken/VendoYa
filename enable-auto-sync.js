const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function enableAutoSync() {
  console.log('🔧 Habilitando auto-sync...');
  
  // Insertar o actualizar configuración
  const { data, error } = await supabase
    .from('system_config')
    .upsert([
      {
        config_key: 'auto_sync_properties',
        config_value: 'true',
        description: 'Sincronización automática habilitada',
        updated_at: new Date().toISOString()
      },
      {
        config_key: 'sync_interval_minutes',
        config_value: '5',
        description: 'Intervalo de sincronización en minutos',
        updated_at: new Date().toISOString()
      }
    ], {
      onConflict: 'config_key'
    });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Auto-sync habilitado correctamente');

  // Verificar configuración
  const { data: config } = await supabase
    .from('system_config')
    .select('*')
    .in('config_key', ['auto_sync_properties', 'sync_interval_minutes']);

  console.log('\n📊 Configuración actual:');
  console.table(config);

  process.exit(0);
}

enableAutoSync();
