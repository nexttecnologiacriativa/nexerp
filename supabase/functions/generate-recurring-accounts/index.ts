import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n🚀 === PROCESSANDO RECORRÊNCIAS ===`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Chamar a função do banco que processa todas as recorrências
    const { data, error } = await supabase.rpc('process_recurring_transactions');
    
    if (error) {
      console.error('❌ Erro ao processar recorrências:', error);
      throw error;
    }
    
    const executionTime = Date.now() - startTime;
    const { created_payables, created_receivables } = data[0] || { created_payables: 0, created_receivables: 0 };
    const totalCreated = created_payables + created_receivables;
    
    console.log(`\n🎉 === PROCESSAMENTO CONCLUÍDO ===`);
    console.log(`⏱️ Tempo de execução: ${executionTime}ms`);
    console.log(`💳 Contas a pagar criadas: ${created_payables}`);
    console.log(`💰 Contas a receber criadas: ${created_receivables}`);
    console.log(`✅ Total criado: ${totalCreated}`);
    
    const result = {
      success: true,
      message: 'Recorrências processadas com sucesso',
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      summary: {
        payables_created: created_payables,
        receivables_created: created_receivables,
        total_created: totalCreated
      }
    };
    
    return new Response(
      JSON.stringify(result, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`\n💥 === ERRO NO PROCESSAMENTO ===`);
    console.error(`⏱️ Tempo até erro: ${executionTime}ms`);  
    console.error(`❌ Erro:`, error);
    
    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime
    };
    
    return new Response(
      JSON.stringify(errorResult, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});