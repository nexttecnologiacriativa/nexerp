-- Create payment_methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_methods
CREATE POLICY "Payment methods can be viewed by company users"
  ON public.payment_methods
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Payment methods can be managed by company users"
  ON public.payment_methods
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Create cash_flow table for tracking all financial movements
CREATE TABLE IF NOT EXISTS public.cash_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category_id UUID,
  subcategory_id UUID,
  bank_account_id UUID,
  payment_method_id UUID,
  related_account_id UUID,
  related_account_type TEXT CHECK (related_account_type IN ('receivable', 'payable', 'sale')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cash_flow
ALTER TABLE public.cash_flow ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cash_flow
CREATE POLICY "Cash flow can be viewed by company users"
  ON public.cash_flow
  FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Cash flow can be managed by company users"
  ON public.cash_flow
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Add payment_method_id to existing tables
ALTER TABLE public.accounts_payable
ADD COLUMN IF NOT EXISTS payment_method_id UUID;

ALTER TABLE public.accounts_receivable
ADD COLUMN IF NOT EXISTS payment_method_id UUID;

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS payment_method_id UUID;

-- Add triggers for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_updated_at
  BEFORE UPDATE ON public.cash_flow
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment methods for existing companies
INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'PIX', 'Pagamento instantâneo via PIX'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'PIX'
);

INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'Cartão de Crédito', 'Pagamento com cartão de crédito'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Crédito'
);

INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'Cartão de Débito', 'Pagamento com cartão de débito'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cartão de Débito'
);

INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'Transferência Bancária', 'TED/DOC'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Transferência Bancária'
);

INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'Boleto', 'Boleto bancário'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Boleto'
);

INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'Dinheiro', 'Pagamento em espécie'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Dinheiro'
);

INSERT INTO public.payment_methods (company_id, name, description)
SELECT c.id, 'Cheque', 'Pagamento com cheque'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_methods pm 
  WHERE pm.company_id = c.id AND pm.name = 'Cheque'
);