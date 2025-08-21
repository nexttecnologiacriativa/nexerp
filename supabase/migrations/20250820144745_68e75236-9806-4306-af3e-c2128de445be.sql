-- Add UPDATE policy for companies table so users can update their company data
CREATE POLICY "Users can update their company" 
ON public.companies 
FOR UPDATE 
TO authenticated
USING (id IN ( SELECT profiles.company_id
   FROM profiles
  WHERE (profiles.id = auth.uid())))
WITH CHECK (id IN ( SELECT profiles.company_id
   FROM profiles
  WHERE (profiles.id = auth.uid())));