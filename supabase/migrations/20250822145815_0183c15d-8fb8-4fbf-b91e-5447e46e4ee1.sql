-- Função para calcular próxima data de vencimento (corrigida)
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  base_date date,
  frequency text,
  interval_value integer
) RETURNS date
LANGUAGE plpgsql
AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN base_date + (interval_value || ' days')::interval;
    WHEN 'weekly' THEN
      RETURN base_date + (interval_value || ' weeks')::interval;
    WHEN 'monthly' THEN
      RETURN base_date + (interval_value || ' months')::interval;
    WHEN 'quarterly' THEN
      RETURN base_date + (interval_value * 3 || ' months')::interval;
    WHEN 'yearly' THEN
      RETURN base_date + (interval_value || ' years')::interval;
    ELSE
      RETURN base_date + (interval_value || ' months')::interval;
  END CASE;
END;
$$;

-- Função para gerar próxima parcela de conta a receber (corrigida)
CREATE OR REPLACE FUNCTION public.generate_next_receivable(parent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  parent_record public.accounts_receivable%ROWTYPE;
  new_due_date date;
  new_id uuid;
BEGIN
  -- Buscar registro pai
  SELECT * INTO parent_record 
  FROM public.accounts_receivable 
  WHERE id = parent_id AND is_recurring = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calcular próxima data
  new_due_date := public.calculate_next_due_date(
    COALESCE(parent_record.next_due_date, parent_record.due_date), 
    parent_record.recurrence_frequency, 
    parent_record.recurrence_interval
  );
  
  -- Verificar se não passou da data limite
  IF parent_record.recurrence_end_date IS NOT NULL AND new_due_date > parent_record.recurrence_end_date THEN
    RETURN NULL;
  END IF;
  
  -- Criar nova parcela
  INSERT INTO public.accounts_receivable (
    company_id, customer_id, description, amount, due_date,
    payment_method, bank_account_id, notes, document_number,
    is_recurring, parent_transaction_id, recurrence_count, status
  ) VALUES (
    parent_record.company_id, parent_record.customer_id,
    parent_record.description || ' (Parcela ' || (parent_record.recurrence_count + 1) || ')',
    parent_record.amount, new_due_date, parent_record.payment_method,
    parent_record.bank_account_id, parent_record.notes, parent_record.document_number,
    false, parent_record.id, parent_record.recurrence_count + 1, 'pending'
  ) RETURNING id INTO new_id;
  
  -- Atualizar registro pai
  UPDATE public.accounts_receivable 
  SET recurrence_count = recurrence_count + 1,
      next_due_date = new_due_date
  WHERE id = parent_id;
  
  RETURN new_id;
END;
$$;

-- Corrigir função de conta a pagar também
CREATE OR REPLACE FUNCTION public.generate_next_payable(parent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  parent_record public.accounts_payable%ROWTYPE;
  new_due_date date;
  new_id uuid;
BEGIN
  -- Buscar registro pai
  SELECT * INTO parent_record 
  FROM public.accounts_payable 
  WHERE id = parent_id AND is_recurring = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calcular próxima data
  new_due_date := public.calculate_next_due_date(
    COALESCE(parent_record.next_due_date, parent_record.due_date), 
    parent_record.recurrence_frequency, 
    parent_record.recurrence_interval
  );
  
  -- Verificar se não passou da data limite
  IF parent_record.recurrence_end_date IS NOT NULL AND new_due_date > parent_record.recurrence_end_date THEN
    RETURN NULL;
  END IF;
  
  -- Criar nova parcela
  INSERT INTO public.accounts_payable (
    company_id, supplier_id, cost_center_id, description, amount,
    due_date, payment_method, bank_account_id, notes, document_number,
    is_recurring, parent_transaction_id, recurrence_count, status
  ) VALUES (
    parent_record.company_id, parent_record.supplier_id, parent_record.cost_center_id,
    parent_record.description || ' (Parcela ' || (parent_record.recurrence_count + 1) || ')',
    parent_record.amount, new_due_date, parent_record.payment_method,
    parent_record.bank_account_id, parent_record.notes, parent_record.document_number,
    false, parent_record.id, parent_record.recurrence_count + 1, 'pending'
  ) RETURNING id INTO new_id;
  
  -- Atualizar registro pai
  UPDATE public.accounts_payable 
  SET recurrence_count = recurrence_count + 1,
      next_due_date = new_due_date
  WHERE id = parent_id;
  
  RETURN new_id;
END;
$$;