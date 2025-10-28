-- Adicionar coluna type na tabela categories
ALTER TABLE public.categories
ADD COLUMN type text NOT NULL DEFAULT 'expense' CHECK (type IN ('revenue', 'expense'));

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.categories.type IS 'Tipo de categoria: revenue (receita) ou expense (despesa)';

-- Criar índice para melhorar performance de queries filtradas por tipo
CREATE INDEX idx_categories_type ON public.categories(type);
CREATE INDEX idx_categories_company_type ON public.categories(company_id, type);
