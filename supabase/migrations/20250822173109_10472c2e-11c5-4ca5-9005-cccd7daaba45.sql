-- Adicionar campo subcategory_id nas tabelas de contas a pagar e receber
ALTER TABLE accounts_payable 
ADD COLUMN subcategory_id UUID REFERENCES subcategories(id);

ALTER TABLE accounts_receivable 
ADD COLUMN subcategory_id UUID REFERENCES subcategories(id);

-- Criar índices para melhor performance
CREATE INDEX idx_accounts_payable_subcategory_id ON accounts_payable(subcategory_id);
CREATE INDEX idx_accounts_receivable_subcategory_id ON accounts_receivable(subcategory_id);

-- Função para atualizar saldo bancário
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Criar triggers para atualizar saldo bancário automaticamente
CREATE TRIGGER trigger_update_bank_balance_payable
  AFTER UPDATE ON accounts_payable
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_balance();

CREATE TRIGGER trigger_update_bank_balance_receivable
  AFTER UPDATE ON accounts_receivable
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_balance();