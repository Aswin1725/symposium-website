-- ==============================================================================
-- PERMANENTLY REMOVE SPECIFIED TEST REGISTRATIONS ONLY
-- Target 1: NEX-609258 — Test Team Beta — Tech Quiz (UUID: fc3ebe73-191a-406e-8777-77b4e39f62c8)
-- Target 2: NEX-252620 — Test Team Alpha — Paper Presentation (UUID: 8ac2c163-99cf-41c2-bae0-27b8a47ed80e)
-- ==============================================================================

BEGIN;

-- 1. Delete associated member records for these two test registrations
DELETE FROM public.members 
WHERE registration_id IN (
  SELECT id FROM public.registrations WHERE registration_number IN ('NEX-609258', 'NEX-252620')
)
OR registration_id IN (
  'fc3ebe73-191a-406e-8777-77b4e39f62c8'::uuid,
  '8ac2c163-99cf-41c2-bae0-27b8a47ed80e'::uuid
);

-- 2. Delete associated payment records for these two test registrations
DELETE FROM public.payments 
WHERE registration_id IN (
  SELECT id FROM public.registrations WHERE registration_number IN ('NEX-609258', 'NEX-252620')
)
OR registration_id IN (
  'fc3ebe73-191a-406e-8777-77b4e39f62c8'::uuid,
  '8ac2c163-99cf-41c2-bae0-27b8a47ed80e'::uuid
);

-- 3. Delete the two test registration records
DELETE FROM public.registrations 
WHERE registration_number IN ('NEX-609258', 'NEX-252620')
   OR id IN (
     'fc3ebe73-191a-406e-8777-77b4e39f62c8'::uuid,
     '8ac2c163-99cf-41c2-bae0-27b8a47ed80e'::uuid
   );

COMMIT;

-- ==============================================================================
-- VERIFICATION QUERIES (Run these to confirm complete removal from database)
-- ==============================================================================

-- Check 1: Registrations (Must return 0 rows)
SELECT id, registration_number, team_name 
FROM public.registrations 
WHERE registration_number IN ('NEX-609258', 'NEX-252620');

-- Check 2: Members (Must return 0 rows)
SELECT id, registration_id, full_name 
FROM public.members 
WHERE registration_id IN (
  'fc3ebe73-191a-406e-8777-77b4e39f62c8'::uuid,
  '8ac2c163-99cf-41c2-bae0-27b8a47ed80e'::uuid
);

-- Check 3: Payments (Must return 0 rows)
SELECT id, registration_id, utr_number 
FROM public.payments 
WHERE registration_id IN (
  'fc3ebe73-191a-406e-8777-77b4e39f62c8'::uuid,
  '8ac2c163-99cf-41c2-bae0-27b8a47ed80e'::uuid
);
