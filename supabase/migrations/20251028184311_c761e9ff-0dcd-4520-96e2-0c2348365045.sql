-- Adicionar novos valores ao enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'salesperson';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'financial';