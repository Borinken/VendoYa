const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc'
);

(async () => {
  console.log('🔍 Verificando estado del sistema...\n');
  
  // 1. Verificar filtros
  const { data: filters, error: filtersError } = await supabase
    .from('capture_filters')
    .select('*');
  
  if (filtersError) {
    console.log('❌ Error obteniendo filtros:', filtersError.message);
  } else {
    console.log('📊 Filtros:', filters.length);
    if (filters.length > 0) {
      console.log('Filtros encontrados:');
      filters.forEach(f => {
        console.log(`  - ${f.name} | Plataforma: ${f.source} | Activo: ${f.is_active} | Ciudad: ${f.city}`);
      });
    } else {
      console.log('⚠️  No hay filtros creados');
    }
  }
  
  console.log('');
  
  // 2. Verificar propiedades
  const { data: properties, error: propsError } = await supabase
    .from('captured_properties')
    .select('*');
  
  if (propsError) {
    console.log('❌ Error obteniendo propiedades:', propsError.message);
  } else {
    console.log('🏠 Propiedades capturadas:', properties.length);
    if (properties.length > 0) {
      console.log('Últimas propiedades:');
      properties.slice(0, 3).forEach(p => {
        console.log(`  - ${p.source} | ID: ${p.source_id} | Status: ${p.status}`);
      });
    } else {
      console.log('⚠️  No hay propiedades capturadas aún');
    }
  }
  
  console.log('');
  
  // 3. Verificar auto-sync
  const { data: config, error: configError } = await supabase
    .from('system_config')
    .select('*')
    .eq('config_key', 'auto_sync_properties')
    .single();
  
  if (!configError && config) {
    console.log('🔄 Auto-sync:', config.config_value === 'true' ? '✅ ACTIVO' : '❌ INACTIVO');
  }
  
  // 4. Verificar credenciales
  const { data: creds, error: credsError } = await supabase
    .from('system_config')
    .select('config_key')
    .in('config_key', ['idealista_username', 'fotocasa_username', 'realadvisor_username']);
  
  if (!credsError && creds) {
    console.log('🔑 Credenciales configuradas:', creds.map(c => c.config_key.replace('_username', '')).join(', '));
  }
})();
