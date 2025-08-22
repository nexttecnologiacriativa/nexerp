-- Add missing columns to accounts_payable
ALTER TABLE public.accounts_payable 
ADD COLUMN IF NOT EXISTS next_due_date date,
ADD COLUMN IF NOT EXISTS recurrence_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid;

-- Add missing columns to accounts_receivable  
ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS next_due_date date,
ADD COLUMN IF NOT EXISTS recurrence_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid;