-- Alterar colunas document e phone para NOT NULL na tabela customers
-- Primeiro, atualizar registros existentes que possam ter valores nulos
UPDATE customers 
SET document = COALESCE(document, ''), 
    phone = COALESCE(phone, '')
WHERE document IS NULL OR phone IS NULL;

-- Agora alterar as colunas para NOT NULL
ALTER TABLE customers 
ALTER COLUMN document SET NOT NULL,
ALTER COLUMN phone SET NOT NULL;