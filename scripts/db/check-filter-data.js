const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjUyMjcsImV4cCI6MjA5MzUwMTIyN30.pgl9RvJfkkIVISXmClXbEcnz9KFHBht7mqc7F-Ftk2k'
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
