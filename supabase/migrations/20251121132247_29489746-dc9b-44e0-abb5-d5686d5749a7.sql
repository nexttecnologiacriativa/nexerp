-- Add agency/branch field to bank_accounts table
ALTER TABLE bank_accounts 
ADD COLUMN agency TEXT;