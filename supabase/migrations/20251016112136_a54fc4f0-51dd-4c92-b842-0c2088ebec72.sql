-- 1. Criar enum para roles do sistema
CREATE TYPE public.app_role AS ENUM ('super_admin', 'company_admin', 'manager', 'user');

-- 2. Criar tabela user_roles (separada e segura)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Criar função de segurança (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4. Atribuir super_admin ao usuário otavio.james@next.tec.br
INSERT INTO public.user_roles (user_id, role)
VALUES ('4030b07f-20b8-4e10-9437-256810ad270e', 'super_admin');

-- 5. Criar tabela de planos
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_yearly NUMERIC(10,2),
  max_users INTEGER,
  max_companies INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 6. Criar tabela de assinaturas das empresas
CREATE TABLE public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  trial_end_date DATE,
  is_trial BOOLEAN DEFAULT false,
  payment_status TEXT DEFAULT 'pending',
  next_billing_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_by UUID REFERENCES auth.users(id),
  suspended_reason TEXT
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Criar tabela de histórico de uso
CREATE TABLE public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- 8. Adicionar campos na tabela companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);

-- 9. RLS Policies para user_roles
CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 10. RLS Policies para subscription_plans
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 11. RLS Policies para company_subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.company_subscriptions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company users can view own subscription"
ON public.company_subscriptions FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Super admins can manage subscriptions"
ON public.company_subscriptions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 12. RLS Policies para usage_logs
CREATE POLICY "Super admins can view all logs"
ON public.usage_logs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 13. Atualizar policies da tabela companies
CREATE POLICY "Super admins can view all companies"
ON public.companies FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update any company"
ON public.companies FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- 14. Função para verificar status da assinatura
CREATE OR REPLACE FUNCTION public.check_subscription_status(company_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_blocked BOOLEAN;
  subscription_active BOOLEAN;
BEGIN
  SELECT is_blocked INTO company_blocked
  FROM companies
  WHERE id = company_uuid;
  
  IF company_blocked THEN
    RETURN 'blocked';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM company_subscriptions
    WHERE company_id = company_uuid
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  ) INTO subscription_active;
  
  IF subscription_active THEN
    RETURN 'active';
  ELSE
    RETURN 'expired';
  END IF;
END;
$$;

-- 15. Inserir planos iniciais
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, max_users, max_companies, features, is_active)
VALUES 
  ('Starter', 'Plano básico para pequenas empresas', 99.00, 990.00, 3, 1, 
   '{"recursos": ["Gestão financeira básica", "Até 3 usuários", "1 empresa", "Suporte por email"]}'::jsonb, true),
  ('Business', 'Plano para empresas em crescimento', 299.00, 2990.00, 15, 3, 
   '{"recursos": ["Todos os recursos", "Até 15 usuários", "3 empresas", "Suporte prioritário", "Relatórios avançados"]}'::jsonb, true),
  ('Enterprise', 'Plano completo para grandes empresas', 799.00, 7990.00, NULL, 10, 
   '{"recursos": ["Usuários ilimitados", "10 empresas", "Suporte dedicado", "Customizações", "API access"]}'::jsonb, true);

-- 16. Trigger para atualizar updated_at em subscription_plans
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 17. Trigger para atualizar updated_at em company_subscriptions
CREATE TRIGGER update_company_subscriptions_updated_at
BEFORE UPDATE ON public.company_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();