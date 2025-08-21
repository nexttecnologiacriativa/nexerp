-- Add company_id to profiles table to ensure all users are linked to a company
-- First update the profiles table to have NOT NULL company_id after we ensure users have companies

-- Create a default company for existing profiles that don't have one
DO $$ 
DECLARE
    default_company_id uuid;
    profile_record record;
BEGIN
    -- Create default company if needed
    INSERT INTO public.companies (name, document, document_type, status)
    VALUES ('Empresa Padrão', '00000000000000', 'cnpj', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id INTO default_company_id;
    
    -- If no company was created (already exists), get the first company
    IF default_company_id IS NULL THEN
        SELECT id INTO default_company_id FROM public.companies LIMIT 1;
    END IF;
    
    -- Update profiles without company_id to use default company
    UPDATE public.profiles 
    SET company_id = default_company_id 
    WHERE company_id IS NULL;
END $$;

-- Now make company_id NOT NULL since all profiles should have a company
ALTER TABLE public.profiles 
ALTER COLUMN company_id SET NOT NULL;

-- Update the trigger function to include company assignment for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
    default_company_id uuid;
BEGIN
    -- Get the first company (or create one if none exists)
    SELECT id INTO default_company_id FROM public.companies LIMIT 1;
    
    -- If no company exists, create a default one
    IF default_company_id IS NULL THEN
        INSERT INTO public.companies (name, document, document_type, status)
        VALUES ('Empresa Padrão', '00000000000000', 'cnpj', 'active')
        RETURNING id INTO default_company_id;
    END IF;

    -- Insert profile with company_id
    INSERT INTO public.profiles (id, full_name, email, company_id)
    VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email, default_company_id);
    RETURN new;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();