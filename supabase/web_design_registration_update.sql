-- NEXTRON 2026
-- Web Design event configuration update
--
-- Production value:
--   team size: 1–3 members
--   fee: ₹50 per head
--
-- Note:
-- The production Supabase database was updated manually before
-- this file was committed. This SQL is idempotent and records
-- the intended configuration in the repository.

UPDATE public.events
SET
  min_members = 1,
  max_members = 3
WHERE name = 'Web Design';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.events
    WHERE name = 'Web Design'
      AND min_members = 1
      AND max_members = 3
  ) THEN
    RAISE EXCEPTION
      'Web Design event configuration update failed';
  END IF;
END;
$$;
