-- Primeiro, vou remover o trigger atual que não está funcionando corretamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar uma função melhor para processar o cadastro completo
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  company_uuid uuid;
BEGIN
  -- Verificar se já existe um perfil (evitar duplicação)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Criar empresa se os dados estiverem nos metadados
  IF NEW.raw_user_meta_data->>'company_name' IS NOT NULL THEN
    INSERT INTO public.companies (name, document, document_type, status)
    VALUES (
      NEW.raw_user_meta_data->>'company_name',
      'temp-' || NEW.id::text, -- documento temporário
      'cnpj',
      'active'
    )
    RETURNING id INTO company_uuid;
  ELSE
    -- Se não houver dados da empresa, criar uma empresa padrão
    INSERT INTO public.companies (name, document, document_type, status)
    VALUES (
      'Minha Empresa',
      'temp-' || NEW.id::text,
      'cnpj', 
      'pending'
    )
    RETURNING id INTO company_uuid;
  END IF;

  -- Criar o perfil do usuário vinculado à empresa
  INSERT INTO public.profiles (id, company_id, full_name, role)
  VALUES (
    NEW.id,
    company_uuid,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    'admin'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro (opcional)
    RAISE LOG 'Erro no handle_new_user_signup: %', SQLERRM;
    -- Retornar NULL fará o cadastro falhar, forçando uma correção
    RAISE;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();