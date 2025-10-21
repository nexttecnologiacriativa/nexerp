-- Fix function search path mutable security warning
-- Add SET search_path = public to all functions missing it

CREATE OR REPLACE FUNCTION public.calculate_next_due_date(base_date date, frequency text, interval_value integer)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_next_receivable(parent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.generate_next_payable(parent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Se o status mudou para 'paid' e tem bank_account_id
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.bank_account_id IS NOT NULL THEN
    
    -- Se for accounts_payable (saída de dinheiro)
    IF TG_TABLE_NAME = 'accounts_payable' THEN
      UPDATE bank_accounts 
      SET balance = balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
      
    -- Se for accounts_receivable (entrada de dinheiro)  
    ELSIF TG_TABLE_NAME = 'accounts_receivable' THEN
      UPDATE bank_accounts 
      SET balance = balance + NEW.amount,
          updated_at = now()
      WHERE id = NEW.bank_account_id;
    END IF;
    
  -- Se o status mudou de 'paid' para outro status (estorno)
  ELSIF OLD.status = 'paid' AND NEW.status != 'paid' AND OLD.bank_account_id IS NOT NULL THEN
    
    -- Se for accounts_payable (estorno de saída - adiciona de volta)
    IF TG_TABLE_NAME = 'accounts_payable' THEN
      UPDATE bank_accounts 
      SET balance = balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.bank_account_id;
      
    -- Se for accounts_receivable (estorno de entrada - remove)
    ELSIF TG_TABLE_NAME = 'accounts_receivable' THEN
      UPDATE bank_accounts 
      SET balance = balance - OLD.amount,
          updated_at = now()
      WHERE id = OLD.bank_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_generate_recurring_installments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;