const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function ejecutarSQL() {
  console.log('🚀 Ejecutando SQL en Supabase...\n');
  
  // Leer el archivo SQL
  const sqlContent = fs.readFileSync('SISTEMA_EMAIL_SUPABASE.sql', 'utf8');
  
  console.log('📋 SQL a ejecutar:');
  console.log('  - Tabla: email_logs');
  console.log('  - Tabla: tasks');
  console.log('  - Tabla: email_accounts');
  console.log('  - Índices y triggers');
  console.log('  - Vistas y funciones\n');
  
  // Verificar conexión
  console.log('🔌 Verificando conexión...');
  const { data: testData, error: testError } = await supabase
    .from('contacts')
    .select('count', { count: 'exact', head: true });
  
  if (testError) {
    console.error('❌ Error de conexión:', testError.message);
    return;
  }
  
  console.log('✅ Conexión exitosa\n');
  
  // Verificar si las tablas ya existen
  console.log('🔍 Verificando tablas existentes...');
  
  const { data: emailLogs } = await supabase.from('email_logs').select('count').limit(1);
  const { data: tasks } = await supabase.from('tasks').select('count').limit(1);
  const { data: emailAccounts } = await supabase.from('email_accounts').select('count').limit(1);
  
  const tablasExistentes = [];
  if (emailLogs !== null) tablasExistentes.push('email_logs');
  if (tasks !== null) tablasExistentes.push('tasks');
  if (emailAccounts !== null) tablasExistentes.push('email_accounts');
  
  if (tablasExistentes.length > 0) {
    console.log('✅ Tablas ya existentes:', tablasExistentes.join(', '));
    console.log('\n🎉 Sistema de email ya está configurado!\n');
    return;
  }
  
  console.log('⚠️  Tablas no encontradas, necesitan ser creadas\n');
  console.log('📝 IMPORTANTE: El SQL debe ejecutarse manualmente en Supabase SQL Editor\n');
  console.log('🔗 URL: https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new\n');
  console.log('📋 Pasos:');
  console.log('  1. Abre el SQL Editor en Supabase');
  console.log('  2. Copia el contenido de SISTEMA_EMAIL_SUPABASE.sql');
  console.log('  3. Pégalo en el editor y haz clic en RUN');
  console.log('  4. Verifica que se crearon las 3 tablas\n');
  console.log('💡 Alternativa: El archivo está en:');
  console.log('   /Users/LeslyHector/vendoya-crm/SISTEMA_EMAIL_SUPABASE.sql\n');
}

ejecutarSQL().catch(console.error);
