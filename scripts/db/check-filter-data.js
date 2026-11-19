const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  process.env.SUPABASE_ANON_KEY
)

async function checkFilterData() {
  const { data: filters, error } = await supabase
    .from('capture_filters')
    .select('*')
    .eq('is_active', true)

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  console.log('📊 Filtros encontrados:', filters.length)
  console.log('\n📋 Datos completos del filtro:')
  console.log(JSON.stringify(filters[0], null, 2))
}

checkFilterData()
