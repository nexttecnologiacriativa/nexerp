-- Add color field to categories table
ALTER TABLE public.categories ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';

-- Add comment for color field
COMMENT ON COLUMN public.categories.color IS 'Hex code for category color (e.g., #3B82F6)';

-- Create subcategories table
CREATE TABLE public.subcategories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    category_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    status status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for subcategories
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create policies for subcategories
CREATE POLICY "Subcategories can be viewed by company users" 
ON public.subcategories FOR SELECT 
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Subcategories can be managed by company users" 
ON public.subcategories FOR ALL 
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_subcategories_updated_at
    BEFORE UPDATE ON public.subcategories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_subcategories_company_id ON public.subcategories(company_id);
CREATE INDEX idx_subcategories_category_id ON public.subcategories(category_id);

-- Add foreign key constraint
ALTER TABLE public.subcategories 
ADD CONSTRAINT fk_subcategories_category 
FOREIGN KEY (category_id) 
REFERENCES public.categories(id) 
ON DELETE CASCADE;

-- Update some existing categories with colors (examples)
UPDATE public.categories 
SET color = CASE 
    WHEN name ILIKE '%produto%' THEN '#10B981'
    WHEN name ILIKE '%serviço%' THEN '#3B82F6'
    WHEN name ILIKE '%venda%' THEN '#F59E0B'
    WHEN name ILIKE '%marketing%' THEN '#EF4444'
    WHEN name ILIKE '%suporte%' THEN '#8B5CF6'
    ELSE '#6B7280'
END;