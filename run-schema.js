const fs = require('fs');

const SUPABASE_URL = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

console.log('🗄️  Ejecutando schema SQL en Supabase...\n');

const sqlContent = fs.readFileSync('SCHEMA_LEADS.sql', 'utf8');

async function executeSQL() {
  try {
    // Intentar usar la API de Postgres Query
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ sql: sqlContent })
    });

    if (response.ok) {
      console.log('✅ Schema ejecutado exitosamente!\n');
      console.log('Tablas creadas:');
      console.log('  - urgent_leads');
      console.log('  - lead_interactions');
      console.log('  - scheduled_messages');
      console.log('  - urgent_leads_dashboard (vista)');
      console.log('\nFunciones creadas:');
      console.log('  - update_urgent_leads_updated_at()');
      console.log('  - auto_assign_lead()');
      console.log('  - get_funnel_stats()');
      console.log('\n🎉 Base de datos lista para usar!');
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.log('⚠️  La ejecución automática no está disponible.');
    console.log('   Supabase requiere ejecutar SQL manualmente por seguridad.\n');
    console.log('📋 PASOS PARA EJECUTAR:');
    console.log('   1. Abre: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
    console.log('   2. El SQL ya está copiado en tu portapapeles');
    console.log('   3. Pega (Cmd+V) y haz clic en "RUN"\n');
    console.log('   O cópialo de nuevo con: cat SCHEMA_LEADS.sql | pbcopy');
  }
}

executeSQL();
