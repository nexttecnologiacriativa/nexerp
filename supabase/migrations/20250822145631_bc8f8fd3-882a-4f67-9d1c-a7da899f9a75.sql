-- Adicionar novos campos para estrutura completa de recorrência
ALTER TABLE public.accounts_payable 
ADD COLUMN recurrence_count integer DEFAULT 0,
ADD COLUMN parent_transaction_id uuid DEFAULT NULL,
ADD COLUMN next_due_date date DEFAULT NULL;

ALTER TABLE public.accounts_receivable 
ADD COLUMN recurrence_count integer DEFAULT 0,
ADD COLUMN parent_transaction_id uuid DEFAULT NULL,
ADD COLUMN next_due_date date DEFAULT NULL;

-- Adicionar foreign keys para vincular transações filhas à original
ALTER TABLE public.accounts_payable 
ADD CONSTRAINT fk_accounts_payable_parent 
FOREIGN KEY (parent_transaction_id) REFERENCES public.accounts_payable(id);

ALTER TABLE public.accounts_receivable 
ADD CONSTRAINT fk_accounts_receivable_parent 
FOREIGN KEY (parent_transaction_id) REFERENCES public.accounts_receivable(id);

-- Função para calcular próxima data de vencimento
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  current_date date,
  frequency text,
  interval_value integer
) RETURNS date
LANGUAGE plpgsql
AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN current_date + (interval_value || ' days')::interval;
    WHEN 'weekly' THEN
      RETURN current_date + (interval_value || ' weeks')::interval;
    WHEN 'monthly' THEN
      RETURN current_date + (interval_value || ' months')::interval;
    WHEN 'quarterly' THEN
      RETURN current_date + (interval_value * 3 || ' months')::interval;
    WHEN 'yearly' THEN
      RETURN current_date + (interval_value || ' years')::interval;
    ELSE
      RETURN current_date + (interval_value || ' months')::interval;
  END CASE;
END;
$$;

-- Função para gerar próxima parcela de conta a pagar
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
    parent_record.next_due_date, 
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

-- Função para gerar próxima parcela de conta a receber
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
    parent_record.next_due_date, 
    parent_record.recurrence_frequency, 
    parent_record.recurrence_interval
  );
  
  -- Verificar se não passou da data limite
  IF parent_record.recurrence_end_date IS NOT NULL AND new_due_date > parent_record.recurrence_end_date THEN
    RETURN NULL;
  END IF;
  
  -- Criar nova parcela
  IN

public.accounts_receivable (
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

-- Função para processar todas as transações recorrentes
CREATE OR REPLACE FUNCTION public.process_recurring_transactions()
RETURNS TABLE(created_payables integer, created_receivables integer)
LANGUAGE plpgsql
AS $$
DECLARE
  payable_record RECORD;
  receivable_record RECORD;
  payable_count integer := 0;
  receivable_count integer := 0;
  new_id uuid;
BEGIN
  -- Processar contas a pagar recorrentes
  FOR payable_record IN 
    SELECT id FROM public.accounts_payable 
    WHERE is_recurring = true 
    AND status = 'pending'
    AND (next_due_date IS NULL OR next_due_date <= CURRENT_DATE + INTERVAL '7 days')
  LOOP
    new_id := public.generate_next_payable(payable_record.id);
    IF new_id IS NOT NULL THEN
      payable_count := payable_count + 1;
    END IF;
  END LOOP;
  
  -- Processar contas a receber recorrentes
  FOR receivable_record IN 
    SELECT id FROM public.accounts_receivable 
    WHERE is_recurring = true 
    AND status = 'pending'
    AND (next_due_date IS NULL OR next_due_date <= CURRENT_DATE + INTERVAL '7 days')
  LOOP
    new_id := public.generate_next_receivable(receivable_record.id);
    IF new_id IS NOT NULL THEN
      receivable_count := receivable_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT payable_count, receivable_count;
END;
$$;