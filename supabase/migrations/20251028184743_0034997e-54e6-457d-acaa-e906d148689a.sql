-- Adicionar coluna theme_preference na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'system'));