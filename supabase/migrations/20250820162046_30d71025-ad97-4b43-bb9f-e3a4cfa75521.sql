-- Adicionar campos de recorrência para accounts_receivable
ALTER TABLE public.accounts_receivable 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_frequency VARCHAR(20) CHECK (recurrence_frequency IN ('monthly', 'quarterly', 'yearly', 'weekly', 'daily')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN next_due_date DATE,
ADD COLUMN parent_transaction_id UUID REFERENCES accounts_receivable(id),
ADD COLUMN recurrence_count INTEGER DEFAULT 0;

-- Adicionar campos de recorrência para accounts_payable
ALTER TABLE public.accounts_payable 
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_frequency VARCHAR(20) CHECK (recurrence_frequency IN ('monthly', 'quarterly', 'yearly', 'weekly', 'daily')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date DATE,
ADD COLUMN next_due_date DATE,
ADD COLUMN parent_transaction_id UUID REFERENCES accounts_payable(id),
ADD COLUMN recurrence_count INTEGER DEFAULT 0;

-- Criar função para gerar próximas parcelas de contas a receber
CREATE OR REPLACE FUNCTION generate_next_receivable(parent_id UUID)
RETURNS UUID AS $$
DECLARE
    parent_record accounts_receivable%ROWTYPE;
    new_due_date DATE;
    new_record_id UUID;
BEGIN
    -- Buscar registro pai
    SELECT * INTO parent_record FROM accounts_receivable WHERE id = parent_id;
    
    IF NOT FOUND OR NOT parent_record.is_recurring THEN
        RETURN NULL;
    END IF;
    
    -- Calcular próxima data de vencimento
    CASE parent_record.recurrence_frequency
        WHEN 'daily' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' days')::INTERVAL;
        WHEN 'weekly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' months')::INTERVAL;
        WHEN 'quarterly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval * 3 || ' months')::INTERVAL;
        WHEN 'yearly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' years')::INTERVAL;
    END CASE;
    
    -- Verificar se não passou da data limite
    IF parent_record.recurrence_end_date IS NOT NULL AND new_due_date > parent_record.recurrence_end_date THEN
        RETURN NULL;
    END IF;
    
    -- Criar novo registro
    INSERT INTO accounts_receivable (
        company_id,
        customer_id,
        description,
        amount,
        due_date,
        status,
        notes,
        is_recurring,
        recurrence_frequency,
        recurrence_interval,
        recurrence_end_date,
        parent_transaction_id,
        recurrence_count
    ) VALUES (
        parent_record.company_id,
        parent_record.customer_id,
        parent_record.description || ' (Parcela ' || (parent_record.recurrence_count + 2) || ')',
        parent_record.amount,
        new_due_date,
        'pending',
        parent_record.notes,
        parent_record.is_recurring,
        parent_record.recurrence_frequency,
        parent_record.recurrence_interval,
        parent_record.recurrence_end_date,
        COALESCE(parent_record.parent_transaction_id, parent_id),
        parent_record.recurrence_count + 1
    ) RETURNING id INTO new_record_id;
    
    -- Atualizar registro pai com nova data
    UPDATE accounts_receivable 
    SET next_due_date = new_due_date,
        recurrence_count = parent_record.recurrence_count + 1
    WHERE id = parent_id;
    
    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- Criar função para gerar próximas parcelas de contas a pagar
CREATE OR REPLACE FUNCTION generate_next_payable(parent_id UUID)
RETURNS UUID AS $$
DECLARE
    parent_record accounts_payable%ROWTYPE;
    new_due_date DATE;
    new_record_id UUID;
BEGIN
    -- Buscar registro pai
    SELECT * INTO parent_record FROM accounts_payable WHERE id = parent_id;
    
    IF NOT FOUND OR NOT parent_record.is_recurring THEN
        RETURN NULL;
    END IF;
    
    -- Calcular próxima data de vencimento
    CASE parent_record.recurrence_frequency
        WHEN 'daily' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' days')::INTERVAL;
        WHEN 'weekly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' months')::INTERVAL;
        WHEN 'quarterly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval * 3 || ' months')::INTERVAL;
        WHEN 'yearly' THEN
            new_due_date := parent_record.due_date + (parent_record.recurrence_interval || ' years')::INTERVAL;
    END CASE;
    
    -- Verificar se não passou da data limite
    IF parent_record.recurrence_end_date IS NOT NULL AND new_due_date > parent_record.recurrence_end_date THEN
        RETURN NULL;
    END IF;
    
    -- Criar novo registro
    INSERT INTO accounts_payable (
        company_id,
        supplier_id,
        description,
        amount,
        due_date,
        status,
        notes,
        is_recurring,
        recurrence_frequency,
        recurrence_interval,
        recurrence_end_date,
        parent_transaction_id,
        recurrence_count
    ) VALUES (
        parent_record.company_id,
        parent_record.supplier_id,
        parent_record.description || ' (Parcela ' || (parent_record.recurrence_count + 2) || ')',
        parent_record.amount,
        new_due_date,
        'pending',
        parent_record.notes,
        parent_record.is_recurring,
        parent_record.recurrence_frequency,
        parent_record.recurrence_interval,
        parent_record.recurrence_end_date,
        COALESCE(parent_record.parent_transaction_id, parent_id),
        parent_record.recurrence_count + 1
    ) RETURNING id INTO new_record_id;
    
    -- Atualizar registro pai com nova data
    UPDATE accounts_payable 
    SET next_due_date = new_due_date,
        recurrence_count = parent_record.recurrence_count + 1
    WHERE id = parent_id;
    
    RETURN new_record_id;
END;
$$ LANGUAGE plpgsql;

-- Criar função para processar recorrências automaticamente
CREATE OR REPLACE FUNCTION process_recurring_transactions()
RETURNS INTEGER AS $$
DECLARE
    rec RECORD;
    generated_count INTEGER := 0;
BEGIN
    -- Processar contas a receber recorrentes
    FOR rec IN 
        SELECT id FROM accounts_receivable 
        WHERE is_recurring = TRUE 
        AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
        AND (recurrence_end_date IS NULL OR next_due_date <= recurrence_end_date)
    LOOP
        IF generate_next_receivable(rec.id) IS NOT NULL THEN
            generated_count := generated_count + 1;
        END IF;
    END LOOP;
    
    -- Processar contas a pagar recorrentes
    FOR rec IN 
        SELECT id FROM accounts_payable 
        WHERE is_recurring = TRUE 
        AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
        AND (recurrence_end_date IS NULL OR next_due_date <= recurrence_end_date)
    LOOP
        IF generate_next_payable(rec.id) IS NOT NULL THEN
            generated_count := generated_count + 1;
        END IF;
    END LOOP;
    
    RETURN generated_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários explicativos
COMMENT ON COLUMN accounts_receivable.is_recurring IS 'Indica se esta conta é recorrente';
COMMENT ON COLUMN accounts_receivable.recurrence_frequency IS 'Frequência da recorrência: daily, weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN accounts_receivable.recurrence_interval IS 'Intervalo da recorrência (ex: a cada 2 meses)';
COMMENT ON COLUMN accounts_receivable.recurrence_end_date IS 'Data limite para gerar recorrências';
COMMENT ON COLUMN accounts_receivable.next_due_date IS 'Próxima data de vencimento para gerar automaticamente';
COMMENT ON COLUMN accounts_receivable.parent_transaction_id IS 'ID da transação pai (para parcelas geradas automaticamente)';
COMMENT ON COLUMN accounts_receivable.recurrence_count IS 'Contador de recorrências geradas';

COMMENT ON COLUMN accounts_payable.is_recurring IS 'Indica se esta conta é recorrente';
COMMENT ON COLUMN accounts_payable.recurrence_frequency IS 'Frequência da recorrência: daily, weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN accounts_payable.recurrence_interval IS 'Intervalo da recorrência (ex: a cada 2 meses)';
COMMENT ON COLUMN accounts_payable.recurrence_end_date IS 'Data limite para gerar recorrências';
COMMENT ON COLUMN accounts_payable.next_due_date IS 'Próxima data de vencimento para gerar automaticamente';
COMMENT ON COLUMN accounts_payable.parent_transaction_id IS 'ID da transação pai (para parcelas geradas automaticamente)';
COMMENT ON COLUMN accounts_payable.recurrence_count IS 'Contador de recorrências geradas';