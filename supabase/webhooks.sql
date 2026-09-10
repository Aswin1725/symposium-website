-- Run this script in the Supabase SQL Editor.
-- This uses a custom trigger function to explicitly construct and send the webhook payload.

CREATE OR REPLACE FUNCTION public.trigger_sync_google_sheet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net
AS $$
DECLARE
  request_body jsonb;
BEGIN
  -- We explicitly build the JSON payload containing the table name, the operation type (INSERT/UPDATE),
  -- and the entire NEW record (which includes 'id' for registrations, and 'registration_id' for members/payments).
  request_body := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW)
  );

  -- We use Supabase's native pg_net extension to asynchronously send the HTTP POST request.
  -- This runs in the background and will never block or crash the database transaction.
  PERFORM net.http_post(
      url := 'https://xlrubebzfrlfojgctriu.supabase.co/functions/v1/sync-google-sheet',
      headers := '{"Content-Type":"application/json", "Authorization":"Bearer 0de818ff864b976b67f0bc5aa91c6821a8ca4909db677eb2d925183954ed6477"}'::jsonb,
      body := request_body
  );
  
  RETURN NEW;
END;
$$;

-- 1. Registrations Webhook
DROP TRIGGER IF EXISTS "registrations_sync_webhook" ON "public"."registrations";
CREATE TRIGGER "registrations_sync_webhook"
  AFTER INSERT OR UPDATE ON "public"."registrations"
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_google_sheet();

-- 2. Members Webhook
DROP TRIGGER IF EXISTS "members_sync_webhook" ON "public"."members";
CREATE TRIGGER "members_sync_webhook"
  AFTER INSERT OR UPDATE ON "public"."members"
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_google_sheet();

-- 3. Payments Webhook
DROP TRIGGER IF EXISTS "payments_sync_webhook" ON "public"."payments";
CREATE TRIGGER "payments_sync_webhook"
  AFTER INSERT OR UPDATE ON "public"."payments"
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_google_sheet();
