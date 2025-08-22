-- Adicionar campos de recorrência para contas a pagar e receber
ALTER TABLE public.accounts_payable 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_frequency text DEFAULT 'monthly', -- 'monthly', 'weekly', 'yearly'
ADD COLUMN recurrence_interval integer DEFAULT 1, -- a cada X unidades de frequência
ADD COLUMN recurrence_end_date date DEFAULT NULL, -- data limite opcional
ADD COLUMN bank_account_id uuid DEFAULT NULL; -- conta bancária vinculada

ALTER TABLE public.accounts_receivable 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_frequency text DEFAULT 'monthly', -- 'monthly', 'weekly', 'yearly'
ADD COLUMN recurrence_interval integer DEFAULT 1, -- a cada X unidades de frequência
ADD COLUMN recurrence_end_date date DEFAULT NULL, -- data limite opcional
ADD COLUMN bank_account_id uuid DEFAULT NULL; -- conta bancária vinculada

-- Adicionar foreign keys para vincular às contas bancárias
ALTER TABLE public.accounts_payable 
ADD CONSTRAINT fk_accounts_payable_bank_account 
FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);

ALTER TABLE public.accounts_receivable 
ADD CONSTRAINT fk_accounts_receivable_bank_account 
FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);