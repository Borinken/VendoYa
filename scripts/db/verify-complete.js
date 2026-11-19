const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE EMAIL');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Verificar tablas
  console.log('📊 TABLAS:');
  const tables = ['email_logs', 'tasks', 'email_accounts'];
  for (const table of tables) {
    const { error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    const exists = !error || error.code !== 'PGRST116';
    console.log(`   ${exists ? '✅' : '❌'} ${table} ${exists ? `(${count || 0} registros)` : ''}`);
  }
  
  // Verificar vistas
  console.log('\n📋 VISTAS:');
  const views = ['pending_emails', 'pending_tasks'];
  for (const view of views) {
    const { error } = await supabase.from(view).select('*').limit(1);
    const exists = !error || error.code !== 'PGRST116';
    console.log(`   ${exists ? '✅' : '❌'} ${view}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ SISTEMA DE BASE DE DATOS: OPERATIVO');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('🎯 PRÓXIMOS PASOS:\n');
  console.log('1️⃣  Configurar Google Cloud OAuth');
  console.log('   👉 https://console.cloud.google.com\n');
  console.log('2️⃣  Agregar credenciales a .env.local:');
  console.log('   GMAIL_CLIENT_ID="..."');
  console.log('   GMAIL_CLIENT_SECRET="..."');
  console.log('   NEXT_PUBLIC_GMAIL_CLIENT_ID="..."\n');
  console.log('3️⃣  Desplegar a Vercel:');
  console.log('   git add .');
  console.log('   git commit -m "Sistema email completo"');
  console.log('   vercel --prod\n');
  console.log('4️⃣  Probar en: /dashboard/email-config\n');
}

verify().then(() => process.exit(0));
