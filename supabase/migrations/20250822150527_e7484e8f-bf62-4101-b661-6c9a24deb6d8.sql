-- Criar função para processar todas as transações recorrentes
CREATE OR REPLACE FUNCTION public.process_recurring_transactions()
RETURNS TABLE(created_payables integer, created_receivables integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payables_count integer := 0;
  receivables_count integer := 0;
  rec RECORD;
  new_id uuid;
BEGIN
  -- Processar contas a pagar recorrentes
  FOR rec IN 
    SELECT id FROM accounts_payable 
    WHERE is_recurring = true 
    AND status != 'cancelled'
    AND (
      next_due_date <= CURRENT_DATE + INTERVAL '30 days'
      OR next_due_date IS NULL
    )
  LOOP
    SELECT generate_next_payable(rec.id) INTO new_id;
    IF new_id IS NOT NULL THEN
      payables_count := payables_count + 1;
    END IF;
  END LOOP;

  -- Processar contas a receber recorrentes
  FOR rec IN 
    SELECT id FROM accounts_receivable 
    WHERE is_recurring = true 
    AND status != 'cancelled'
    AND (
      next_due_date <= CURRENT_DATE + INTERVAL '30 days'
      OR next_due_date IS NULL
    )
  LOOP
    SELECT generate_next_receivable(rec.id) INTO new_id;
    IF new_id IS NOT NULL THEN
      receivables_count := receivables_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT payables_count, receivables_count;
END;
$$;

-- Trigger para gerar automaticamente parcelas futuras quando criar conta recorrente
CREATE OR REPLACE FUNCTION public.auto_generate_recurring_installments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  new_due_date date;
  installment_id uuid;
BEGIN
  -- Só processar se for recorrente e for um INSERT (não UPDATE)
  IF NEW.is_recurring = true AND TG_OP = 'INSERT' AND NEW.parent_transaction_id IS NULL THEN
    -- Gerar até 12 parcelas futuras
    FOR i IN 1..12 LOOP
      -- Calcular próxima data
      new_due_date := calculate_next_due_date(
        COALESCE(NEW.next_due_date, NEW.due_date),
        NEW.recurrence_frequency,
        NEW.recurrence_interval * i
      );
      
      -- Verificar se não passou da data limite
      IF NEW.recurrence_end_date IS NOT NULL AND new_due_date > NEW.recurrence_end_date THEN
        EXIT;
      END IF;
      
      -- Parar se a data for muito distante (mais de 2 anos)
      IF new_due_date > CURRENT_DATE + INTERVAL '2 years' THEN
        EXIT;
      END IF;
      
      -- Inserir nova parcela
      IF TG_TABLE_NAME = 'accounts_payable' THEN
        INSERT INTO accounts_payable (
          company_id, supplier_id, cost_center_id, description, amount,
          due_date, payment_method, bank_account_id, notes, document_number,
          is_recurring, parent_transaction_id, recurrence_count, status
        ) VALUES (
          NEW.company_id, NEW.supplier_id, NEW.cost_center_id,
          NEW.description || ' (Parcela ' || (i + 1) || ')',
          NEW.amount, new_due_date, NEW.payment_method,
          NEW.bank_account_id, NEW.notes, NEW.document_number,
          false, NEW.id, i, 'pending'
        ) RETURNING id INTO installment_id;
      ELSE
        INSERT INTO accounts_receivable (
          company_id, customer_id, description, amount, due_date,
          payment_method, bank_account_id, notes, document_number,
          is_recurring, parent_transaction_id, recurrence_count, status
        ) VALUES (
          NEW.company_id, NEW.customer_id,
          NEW.description || ' (Parcela ' || (i + 1) || ')',
          NEW.amount, new_due_date, NEW.payment_method,
          NEW.bank_account_id, NEW.notes, NEW.document_number,
          false, NEW.id, i, 'pending'
        ) RETURNING id INTO installment_id;
      END IF;
    END LOOP;
    
    -- Atualizar next_due_date no registro pai
    NEW.next_due_date := calculate_next_due_date(
      NEW.due_date,
      NEW.recurrence_frequency,
      NEW.recurrence_interval
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar triggers para ambas as tabelas
DROP TRIGGER IF EXISTS trigger_auto_generate_payable_installments ON accounts_payable;
CREATE TRIGGER trigger_auto_generate_payable_installments
  BEFORE INSERT ON accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_recurring_installments();

DROP TRIGGER IF EXISTS trigger_auto_generate_receivable_installments ON accounts_receivable;
CREATE TRIGGER trigger_auto_generate_receivable_installments
  BEFORE INSERT ON accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_recurring_installments();