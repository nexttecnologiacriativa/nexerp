-- Fix infinite recursion in RLS policies by creating security definer functions

-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Profiles can be viewed by same company users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create security definer function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Create security definer function to check if user belongs to a company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND company_id = target_company_id
  );
$$;

-- Recreate profiles policies without recursion
CREATE POLICY "Users can view profiles in their company"
ON public.profiles
FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Update companies policy to use the security definer function
DROP POLICY IF EXISTS "Companies can be viewed by their users" ON public.companies;
CREATE POLICY "Companies can be viewed by their users"
ON public.companies
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(id));

-- Allow users to update their company information
CREATE POLICY "Users can update their company"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(id));