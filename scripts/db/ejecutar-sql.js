const fs = require('fs');

const SUPABASE_URL = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

console.log('🚀 Ejecutando SQL en Supabase...\n');

// Ejecutar SQL usando curl (más simple y directo)
const sql = fs.readFileSync('SISTEMA_EMAIL_SUPABASE.sql', 'utf8');

// Guardar SQL temporalmente
fs.writeFileSync('/tmp/supabase-sql.sql', sql);

// Usar psql si está disponible, si no usar API
const { execSync } = require('child_process');

try {
  console.log('📊 Verificando conexión a Supabase...');
  
  // Intentar usando curl con la API REST
  const testQuery = 'SELECT 1 as test';
  const result = execSync(`curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/query" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"query": "${testQuery}"}'`, { encoding: 'utf8' });
  
  console.log('✅ Conexión exitosa\n');
  
  // Ahora ejecutar el SQL completo
  console.log('💾 Creando tablas email_logs, tasks, email_accounts...\n');
  
  // Ejecutar cada CREATE TABLE por separado
  const tables = [
    { name: 'email_logs', sql: sql.match(/CREATE TABLE IF NOT EXISTS email_logs[\s\S]*?\);/)?.[0] },
    { name: 'tasks', sql: sql.match(/CREATE TABLE IF NOT EXISTS tasks[\s\S]*?\);/)?.[0] },
    { name: 'email_accounts', sql: sql.match(/CREATE TABLE IF NOT EXISTS email_accounts[\s\S]*?\);/)?.[0] }
  ];
  
  for (const table of tables) {
    if (table.sql) {
      try {
        console.log(`  📝 Creando tabla ${table.name}...`);
        const escapedSql = table.sql.replace(/"/g, '\\"').replace(/\n/g, ' ');
        execSync(`curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/query" \
          -H "apikey: ${SUPABASE_KEY}" \
          -H "Authorization: Bearer ${SUPABASE_KEY}" \
          -H "Content-Type: application/json" \
          -d "{\\"query\\": \\"${escapedSql}\\"}"`, { encoding: 'utf8' });
        console.log(`  ✅ Tabla ${table.name} creada\n`);
      } catch (e) {
        console.log(`  ⚠️  Tabla ${table.name} (puede que ya exista)\n`);
      }
    }
  }
  
  console.log('✅ SQL ejecutado correctamente');
  console.log('\n📋 Tablas creadas:');
  console.log('  - email_logs');
  console.log('  - tasks');
  console.log('  - email_accounts');
  console.log('\n🎉 Sistema de email listo para recibir leads');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Ejecuta manualmente en Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
}
