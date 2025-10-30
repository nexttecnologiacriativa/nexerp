-- Adicionar role company_admin para o usuário Otavio James
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (
  'e318b227-ac4d-4e20-9877-6ccb93a184ce',
  'company_admin'::app_role,
  NULL
)
ON CONFLICT (user_id, role) DO NOTHING;