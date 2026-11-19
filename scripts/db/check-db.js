const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Verificando tablas...\n');
  
  const checks = [
    { name: 'email_logs', table: 'email_logs' },
    { name: 'tasks', table: 'tasks' },
    { name: 'email_accounts', table: 'email_accounts' }
  ];
  
  for (const check of checks) {
    const { error } = await supabase.from(check.table).select('id').limit(1);
    const exists = !error || error.code !== 'PGRST116';
    console.log(`${exists ? '✅' : '❌'} ${check.name}`);
  }
}

main().then(() => process.exit(0));
