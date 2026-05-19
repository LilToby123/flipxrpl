
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with this name
DO $$
BEGIN
  PERFORM cron.unschedule('flipxrpl-poll-deposits');
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

SELECT cron.schedule(
  'flipxrpl-poll-deposits',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--c8f67f5c-d036-4067-9d19-2bead9e2ad88.lovable.app/api/public/cron/poll-deposits',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxbG5zcm5wa2x6cmVrbGxpcWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDEyNjYsImV4cCI6MjA5NDI3NzI2Nn0.u7j2mizKPQKtk8OeogdESeWxRypU1pB7CJxsKmSBY-0'
    ),
    body := '{}'::jsonb
  );
  $$
);
