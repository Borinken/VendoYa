#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// Leer variables de entorno
const SUPABASE_URL = 'https://iuqumqztkzpfefkgguuq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc';

// Leer el archivo SQL
const sqlContent = fs.readFileSync('SCHEMA_LEADS.sql', 'utf8');

console.log('🗄️  Ejecutando schema SQL en Supabase...\n');

// Hacer petición HTTP a la API de Supabase
const data = JSON.stringify({ query: sqlContent });

const options = {
  hostname: 'iuqumqztkzpfefkgguuq.supabase.co',
  port: 443,
  path: '/rest/v1/rpc',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
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
      console.error('❌ Error al ejecutar SQL:');
      console.error('Status Code:', res.statusCode);
      console.error('Response:', responseData);
      console.log('\n⚠️  Intenta ejecutar manualmente en:');
      console.log('https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error de conexión:', error.message);
  console.log('\n⚠️  Ejecuta manualmente el SQL en:');
  console.log('https://supabase.com/dashboard/project/iuqumqztkzpfefkgguuq/sql/new');
  console.log('\nEl SQL está copiado en tu portapapeles (Cmd+V para pegar)');
});

req.write(data);
req.end();
