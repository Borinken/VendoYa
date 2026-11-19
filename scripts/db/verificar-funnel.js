const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://iuqumqztkzpfefkgguuq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verificarSchema() {
  console.log('🔍 Verificando schema del funnel...\n');

  try {
    // Verificar tabla urgent_leads
    const { data: leads, error: leadsError } = await supabase
      .from('urgent_leads')
      .select('count')
      .limit(1);

    if (leadsError) {
      console.log('❌ Tabla urgent_leads:', leadsError.message);
    } else {
      console.log('✅ Tabla urgent_leads creada correctamente');
    }

    // Verificar tabla lead_interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('lead_interactions')
      .select('count')
      .limit(1);

    if (interactionsError) {
      console.log('❌ Tabla lead_interactions:', interactionsError.message);
    } else {
      console.log('✅ Tabla lead_interactions creada correctamente');
    }

    // Verificar tabla scheduled_messages
    const { data: messages, error: messagesError } = await supabase
      .from('scheduled_messages')
      .select('count')
      .limit(1);

    if (messagesError) {
      console.log('❌ Tabla scheduled_messages:', messagesError.message);
    } else {
      console.log('✅ Tabla scheduled_messages creada correctamente');
    }

    // Verificar vista urgent_leads_dashboard
    const { data: dashboard, error: dashboardError } = await supabase
      .from('urgent_leads_dashboard')
      .select('count')
      .limit(1);

    if (dashboardError) {
      console.log('❌ Vista urgent_leads_dashboard:', dashboardError.message);
    } else {
      console.log('✅ Vista urgent_leads_dashboard creada correctamente');
    }

    // Verificar función get_funnel_stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_funnel_stats', { days_back: 30 });

    if (statsError) {
      console.log('❌ Función get_funnel_stats:', statsError.message);
    } else {
      console.log('✅ Función get_funnel_stats creada correctamente');
      console.log('\n📊 Estadísticas iniciales:', JSON.stringify(stats, null, 2));
    }

    console.log('\n🎉 ¡Schema completamente funcional!');
    console.log('\n📍 Siguiente paso: Probar el funnel en:');
    console.log('   https://vendoya-6do7vkzvd-borinkens-projects.vercel.app/vende-rapido');

  } catch (error) {
    console.error('\n❌ Error de verificación:', error.message);
  }
}

verificarSchema();
