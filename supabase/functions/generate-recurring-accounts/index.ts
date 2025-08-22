import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface RecurringAccount {
  id: string;
  company_id: string;
  customer_id?: string;
  supplier_id?: string;
  description: string;
  amount: number;
  due_date: string;
  recurrence_frequency: string;
  recurrence_interval: number;
  recurrence_end_date?: string;
  payment_method?: string;
  bank_account_id?: string;
  notes?: string;
  document_number?: string;
  cost_center_id?: string;
}

function getNextDueDate(currentDate: Date, frequency: string, interval: number): Date {
  const nextDate = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + (7 * interval));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + interval);
  }
  
  return nextDate;
}

function shouldCreateNextAccount(account: RecurringAccount, nextDueDate: Date): boolean {
  const today = new Date();
  const daysInAdvance = 30; // Gerar contas com 30 dias de antecedência
  const advanceDate = new Date(today);
  advanceDate.setDate(advanceDate.getDate() + daysInAdvance);
  
  console.log(`Avaliando conta ${account.id}:`);
  console.log(`- Data atual: ${today.toISOString()}`);
  console.log(`- Próxima data de vencimento: ${nextDueDate.toISOString()}`);
  console.log(`- Data de antecedência: ${advanceDate.toISOString()}`);
  console.log(`- Data limite: ${account.recurrence_end_date || 'Indefinida'}`);
  
  // Verificar se deve criar (se a próxima data está dentro do período de antecedência)
  if (nextDueDate > advanceDate) {
    console.log(`- ❌ Próxima data está além do período de antecedência`);
    return false;
  }
  
  // Verificar se não passou da data limite (se houver)
  if (account.recurrence_end_date) {
    const endDate = new Date(account.recurrence_end_date);
    if (nextDueDate > endDate) {
      console.log(`- ❌ Próxima data passou da data limite`);
      return false;
    }
  }
  
  console.log(`- ✅ Deve criar próxima conta`);
  return true;
}

async function generateRecurringPayables() {
  console.log('🔄 Iniciando geração de contas a pagar recorrentes...');
  
  try {
    // Buscar contas a pagar recorrentes ativas
    const { data: recurringPayables, error: payablesError } = await supabase
      .from('accounts_payable')
      .select('*')
      .eq('is_recurring', true)
      .in('status', ['pending', 'overdue']);

    if (payablesError) {
      console.error('❌ Erro ao buscar contas a pagar recorrentes:', payablesError);
      throw payablesError;
    }

    console.log(`📋 Encontradas ${recurringPayables?.length || 0} contas a pagar recorrentes`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const account of recurringPayables || []) {
      console.log(`\n🔍 Processando conta: ${account.description} (ID: ${account.id})`);
      
      const currentDueDate = new Date(account.due_date);
      const nextDueDate = getNextDueDate(currentDueDate, account.recurrence_frequency, account.recurrence_interval);
      
      if (shouldCreateNextAccount(account, nextDueDate)) {
        // Verificar se já existe uma conta para esta data
        const { data: existingAccount } = await supabase
          .from('accounts_payable')
          .select('id')
          .eq('supplier_id', account.supplier_id)
          .eq('description', `${account.description} (Recorrente)`)
          .eq('due_date', nextDueDate.toISOString().split('T')[0])
          .eq('company_id', account.company_id)
          .maybeSingle();

        if (existingAccount) {
          console.log(`⚠️ Conta já existe para esta data`);
          skippedCount++;
          continue;
        }

        // Criar nova conta
        const newAccount = {
          company_id: account.company_id,
          supplier_id: account.supplier_id,
          description: `${account.description} (Recorrente)`,
          amount: account.amount,
          due_date: nextDueDate.toISOString().split('T')[0],
          payment_method: account.payment_method,
          bank_account_id: account.bank_account_id,
          notes: account.notes,
          document_number: account.document_number,
          cost_center_id: account.cost_center_id,
          is_recurring: false, // A conta gerada não é recorrente, apenas a original
          status: 'pending'
        };

        const { data: newAccountData, error: insertError } = await supabase
          .from('accounts_payable')
          .insert(newAccount)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar conta a pagar recorrente:', insertError);
        } else {
          console.log(`✅ Conta criada com sucesso! ID: ${newAccountData.id}`);
          createdCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n📊 Resumo Contas a Pagar:`);
    console.log(`- Contas criadas: ${createdCount}`);
    console.log(`- Contas ignoradas: ${skippedCount}`);
    
    return { created: createdCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Erro ao processar contas a pagar recorrentes:', error);
    throw error;
  }
}

async function generateRecurringReceivables() {
  console.log('\n🔄 Iniciando geração de contas a receber recorrentes...');
  
  try {
    // Buscar contas a receber recorrentes ativas
    const { data: recurringReceivables, error: receivablesError } = await supabase
      .from('accounts_receivable')
      .select('*')
      .eq('is_recurring', true)
      .in('status', ['pending', 'overdue']);

    if (receivablesError) {
      console.error('❌ Erro ao buscar contas a receber recorrentes:', receivablesError);
      throw receivablesError;
    }

    console.log(`📋 Encontradas ${recurringReceivables?.length || 0} contas a receber recorrentes`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const account of recurringReceivables || []) {
      console.log(`\n🔍 Processando conta: ${account.description} (ID: ${account.id})`);
      
      const currentDueDate = new Date(account.due_date);
      const nextDueDate = getNextDueDate(currentDueDate, account.recurrence_frequency, account.recurrence_interval);
      
      if (shouldCreateNextAccount(account, nextDueDate)) {
        // Verificar se já existe uma conta para esta data
        const { data: existingAccount } = await supabase
          .from('accounts_receivable')
          .select('id')
          .eq('customer_id', account.customer_id)
          .eq('description', `${account.description} (Recorrente)`)
          .eq('due_date', nextDueDate.toISOString().split('T')[0])
          .eq('company_id', account.company_id)
          .maybeSingle();

        if (existingAccount) {
          console.log(`⚠️ Conta já existe para esta data`);
          skippedCount++;
          continue;
        }

        // Criar nova conta
        const newAccount = {
          company_id: account.company_id,
          customer_id: account.customer_id,
          description: `${account.description} (Recorrente)`,
          amount: account.amount,
          due_date: nextDueDate.toISOString().split('T')[0],
          payment_method: account.payment_method,
          bank_account_id: account.bank_account_id,
          notes: account.notes,
          document_number: account.document_number,
          is_recurring: false, // A conta gerada não é recorrente, apenas a original
          status: 'pending'
        };

        const { data: newAccountData, error: insertError } = await supabase
          .from('accounts_receivable')
          .insert(newAccount)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Erro ao criar conta a receber recorrente:', insertError);
        } else {
          console.log(`✅ Conta criada com sucesso! ID: ${newAccountData.id}`);
          createdCount++;
        }
      } else {
        skippedCount++;
      }
    }

    console.log(`\n📊 Resumo Contas a Receber:`);
    console.log(`- Contas criadas: ${createdCount}`);
    console.log(`- Contas ignoradas: ${skippedCount}`);
    
    return { created: createdCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ Erro ao processar contas a receber recorrentes:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n🚀 === INICIANDO GERAÇÃO DE CONTAS RECORRENTES ===`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    const [payablesResult, receivablesResult] = await Promise.all([
      generateRecurringPayables(),
      generateRecurringReceivables()
    ]);
    
    const totalCreated = payablesResult.created + receivablesResult.created;
    const totalSkipped = payablesResult.skipped + receivablesResult.skipped;
    const executionTime = Date.now() - startTime;
    
    console.log(`\n🎉 === PROCESSAMENTO CONCLUÍDO ===`);
    console.log(`⏱️ Tempo de execução: ${executionTime}ms`);
    console.log(`✅ Total de contas criadas: ${totalCreated}`);
    console.log(`⚠️ Total de contas ignoradas: ${totalSkipped}`);
    
    const result = {
      success: true,
      message: 'Contas recorrentes processadas com sucesso',
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
      summary: {
        payables: payablesResult,
        receivables: receivablesResult,
        total_created: totalCreated,
        total_skipped: totalSkipped
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