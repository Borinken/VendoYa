const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Verificando tablas necesarias...\n');
  
  const tables = ['capture_filters', 'captured_properties', 'property_alarms', 'system_config'];
  const results = [];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        results.push({ table, exists: false, error: error.message });
      } else {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        results.push({ table, exists: true, count: count || 0 });
      }
    } catch (e) {
      results.push({ table, exists: false, error: e.message });
    }
  }
  
  console.log('📊 Resultados:\n');
  results.forEach(r => {
    if (r.exists) {
      console.log(`  ✅ ${r.table} (${r.count} registros)`);
    } else {
      console.log(`  ❌ ${r.table} - ${r.error}`);
    }
  });
  
  const missing = results.filter(r => !r.exists);
  
  if (missing.length > 0) {
    console.log('\n⚠️  Tablas faltantes:');
    missing.forEach(m => {
      console.log(`  - ${m.table}`);
    });
    
    console.log('\n📋 Solución:');
    console.log('Ve a: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
    console.log('Ejecuta: EJECUTAR_EN_SUPABASE_COMPLETO.sql');
    process.exit(1);
  }
  
  console.log('\n✅ Todas las tablas existen correctamente');
  process.exit(0);
}

checkTables();
