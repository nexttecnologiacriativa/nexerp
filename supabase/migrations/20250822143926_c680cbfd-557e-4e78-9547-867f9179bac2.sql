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
        url:='https://aetsstbmwrdxfnygqwsv.supabase.co/functions/v1/generate-recurring-accounts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldHNzdGJtd3JkeGZueWdxd3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MDU0NzIsImV4cCI6MjA3MTM4MTQ3Mn0.58m6a0d_zrJL9AVU0id7kuqdhAacEJ1fBg6JKa3JpVc"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);