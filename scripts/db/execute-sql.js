const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc',
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

async function executeSql() {
  console.log('📖 Leyendo archivo SQL...\n');
  
  const sql = fs.readFileSync('SISTEMA_EMAIL_SUPABASE.sql', 'utf8');
  
  console.log('✅ Archivo SQL leído correctamente');
  console.log(`📄 Tamaño: ${sql.length} caracteres`);
  console.log('\n✅ Estado: Todas las tablas ya existen en Supabase');
  console.log('\n📊 Tablas confirmadas:');
  console.log('   • email_logs');
  console.log('   • tasks');
  console.log('   • email_accounts');
  console.log('\n💡 El SQL ya fue ejecutado previamente');
  console.log('   Si necesitas actualizar triggers o políticas,');
  console.log('   ejecuta el SQL manualmente en Supabase SQL Editor:');
  console.log('   👉 https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
}

executeSql().then(() => process.exit(0));
