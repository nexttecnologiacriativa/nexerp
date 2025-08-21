-- Create cost_centers table
CREATE TABLE public.cost_centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status status_type NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company data access" 
ON public.cost_centers 
FOR ALL 
USING (company_id IN (
  SELECT profiles.company_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Create trigger for timestamps
CREATE TRIGGER update_cost_centers_updated_at
BEFORE UPDATE ON public.cost_centers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create services table (replacing products temporarily)
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  price NUMERIC,
  category_id UUID,
  status status_type NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company data access" 
ON public.services 
FOR ALL 
USING (company_id IN (
  SELECT profiles.company_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Create trigger for timestamps
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create payment_method enum
CREATE TYPE payment_method AS ENUM (
  'boleto',
  'cartao_credito',
  'cartao_debito',
  'transferencia',
  'pix',
  'cheque',
  'dinheiro',
  'outro'
);

-- Add new columns to accounts_payable
ALTER TABLE public.accounts_payable 
ADD COLUMN cost_center_id UUID,
ADD COLUMN category_id UUID,
ADD COLUMN payment_method payment_method,
ADD COLUMN attachment_url TEXT;

-- Add new columns to accounts_receivable
ALTER TABLE public.accounts_receivable 
ADD COLUMN cost_center_id UUID,
ADD COLUMN category_id UUID,
ADD COLUMN payment_method payment_method,
ADD COLUMN attachment_url TEXT;