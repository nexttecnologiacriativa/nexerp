-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar cron job para rodar a função de geração de contas recorrentes
-- Executa todos os dias às 8:00 da manhã
SELECT cron.schedule(
  'generate-recurring-accounts-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='${VITE_SUPABASE_URL}/functions/v1/generate-recurring-accounts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);