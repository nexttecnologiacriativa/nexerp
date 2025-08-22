-- Adicionar campo category_id nas tabelas de contas a pagar e receber
ALTER TABLE accounts_payable 
ADD COLUMN category_id UUID REFERENCES categories(id);

ALTER TABLE accounts_receivable 
ADD COLUMN category_id UUID REFERENCES categories(id);

-- Criar índices para melhor performance
CREATE INDEX idx_accounts_payable_category_id ON accounts_payable(category_id);
CREATE INDEX idx_accounts_receivable_category_id ON accounts_receivable(category_id);