import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  
  // Verificar se deve criar (se a próxima data está dentro do período de antecedência)
  if (nextDueDate > advanceDate) return false;
  
  // Verificar se não passou da data limite (se houver)
  if (account.recurrence_end_date) {
    const endDate = new Date(account.recurrence_end_date);
    if (nextDueDate > endDate) return false;
  }
  
  return true;
}

async function generateRecurringPayables() {
  try {
    // Buscar contas a pagar recorrentes
    const { data: recurringPayables, error: payablesError } = await supabase
      .from('accounts_payable')
      .select('*')
      .eq('is_recurring', true)
      .eq('status', 'pending');

    if (payablesError) throw payablesError;

    for (const account of recurringPayables || []) {
      const currentDueDate = new Date(account.due_date);
      const nextDueDate = getNextDueDate(currentDueDate, account.recurrence_frequency, account.recurrence_interval);
      
      if (shouldCreateNextAccount(account, nextDueDate)) {
        // Verificar se já existe uma conta para esta data
        const { data: existingAccount } = await supabase
          .from('accounts_payable')
          .select('id')
          .eq('supplier_id', account.supplier_id)
          .eq('description', account.description)
          .eq('due_date', nextDueDate.toISOString().split('T')[0])
          .eq('company_id', account.company_id)
          .single();

        if (!existingAccount) {
          // Criar nova conta
          const { error: insertError } = await supabase
            .from('accounts_payable')
            .insert({
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
            });

          if (insertError) {
            console.error('Erro ao criar conta a pagar recorrente:', insertError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar contas a pagar recorrentes:', error);
  }
}

async function generateRecurringReceivables() {
  try {
    // Buscar contas a receber recorrentes
    const { data: recurringReceivables, error: receivablesError } = await supabase
      .from('accounts_receivable')
      .select('*')
      .eq('is_recurring', true)
      .eq('status', 'pending');

    if (receivablesError) throw receivablesError;

    for (const account of recurringReceivables || []) {
      const currentDueDate = new Date(account.due_date);
      const nextDueDate = getNextDueDate(currentDueDate, account.recurrence_frequency, account.recurrence_interval);
      
      if (shouldCreateNextAccount(account, nextDueDate)) {
        // Verificar se já existe uma conta para esta data
        const { data: existingAccount } = await supabase
          .from('accounts_receivable')
          .select('id')
          .eq('customer_id', account.customer_id)
          .eq('description', account.description)
          .eq('due_date', nextDueDate.toISOString().split('T')[0])
          .eq('company_id', account.company_id)
          .single();

        if (!existingAccount) {
          // Criar nova conta
          const { error: insertError } = await supabase
            .from('accounts_receivable')
            .insert({
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
            });

          if (insertError) {
            console.error('Erro ao criar conta a receber recorrente:', insertError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao processar contas a receber recorrentes:', error);
  }
}

Deno.serve(async (req) => {
  try {
    console.log('Iniciando geração de contas recorrentes...');
    
    await Promise.all([
      generateRecurringPayables(),
      generateRecurringReceivables()
    ]);
    
    console.log('Geração de contas recorrentes concluída com sucesso');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contas recorrentes processadas com sucesso',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Erro na geração de contas recorrentes:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});