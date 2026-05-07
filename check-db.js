const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc'
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
