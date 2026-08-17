const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🗄️  Ejecutando schema SQL en Supabase...\n');

const sqlContent = fs.readFileSync('SCHEMA_LEADS.sql', 'utf8');

// Dividir en statements individuales
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function executeSQL() {
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip comments
    if (statement.trim().startsWith('--')) continue;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: statement 
      });
      
      if (error) {
        console.log(`❌ Error en statement ${i + 1}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1} ejecutado`);
        successCount++;
      }
    } catch (err) {
      // Intentar ejecución directa si RPC no funciona
      console.log(`⚠️  RPC no disponible, intentando ejecución manual en Supabase...`);
      console.log('\n📋 Copia y pega este SQL en Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new\n');
      console.log(sqlContent);
      process.exit(1);
    }
  }
  
  console.log(`\n✅ Ejecución completa: ${successCount} exitosos, ${errorCount} errores`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Base de datos lista! Tablas creadas:');
    console.log('  - urgent_leads');
    console.log('  - lead_interactions');
    console.log('  - scheduled_messages');
    console.log('  - urgent_leads_dashboard (vista)');
    console.log('\nFunciones creadas:');
    console.log('  - update_urgent_leads_updated_at()');
    console.log('  - auto_assign_lead()');
    console.log('  - get_funnel_stats()');
  }
}

executeSQL().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  console.log('\n⚠️  Ejecuta manualmente el SQL en:');
  console.log('https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
  console.log('\nEl SQL está en SCHEMA_LEADS.sql');
});
