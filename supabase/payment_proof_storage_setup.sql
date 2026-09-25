-- ===========================================================================
-- Migration: Payment Proof Storage Setup & Verification Hardening
-- Bucket: payment-proofs (Private, 50 KB limit)
-- ===========================================================================

-- 1. Storage Policies: Students can upload, update (replace) and view payment proofs
DROP POLICY IF EXISTS "Students can upload payment proof" ON storage.objects;
DROP POLICY IF EXISTS "Students can update payment proof" ON storage.objects;
DROP POLICY IF EXISTS "Students can read payment proof" ON storage.objects;

CREATE POLICY "Students can upload payment proof"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Students can update payment proof"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Students can read payment proof"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'payment-proofs');

-- 2. Ensure payments table check constraint allows all verified and rejection statuses
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_status_check 
  CHECK (payment_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'FAILED'));

-- 3. Ensure get_admin_or_coordinator_registrations RPC returns payment_proof_path
CREATE OR REPLACE FUNCTION public.get_admin_or_coordinator_registrations(
  p_token TEXT,
  p_event TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
  v_result JSONB;
BEGIN
  -- Authenticate session
  SELECT * INTO v_session
  FROM public.app_sessions
  WHERE token = p_token AND expires_at > now()
  LIMIT 1;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
  END IF;

  SELECT * INTO v_user
  FROM public.coordinators
  WHERE id = v_session.user_id AND is_active = true
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Inactive account';
  END IF;

  -- Build query: Admin gets all or filtered; Coordinator gets ONLY assigned events
  SELECT jsonb_agg(r_data ORDER BY r_data->>'created_at' DESC) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', r.id,
      'registration_number', r.registration_number,
      'event_id', r.event_id,
      'event', e.name,
      'team_name', r.team_name,
      'college_name', r.college_name,
      'amount', r.amount,
      'registration_status', r.registration_status,
      'created_at', r.created_at,
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', m.id,
          'member_number', m.member_number,
          'name', m.full_name,
          'phone', m.phone,
          'email', m.email,
          'id_card_path', m.id_card_path
        ) ORDER BY m.member_number ASC)
        FROM public.members m
        WHERE m.registration_id = r.id
      ), '[]'::jsonb),
      'payment', (
        SELECT jsonb_build_object(
          'id', p.id,
          'amount', p.amount,
          'utr_number', p.utr_number,
          'payment_status', p.payment_status,
          'verified_at', p.verified_at,
          'verified_by', p.verified_by,
          'remarks', p.remarks,
          'payment_proof_path', p.payment_proof_path,
          'created_at', p.created_at
        )
        FROM public.payments p
        WHERE p.registration_id = r.id
        ORDER BY p.created_at DESC
        LIMIT 1
      )
    ) AS r_data
    FROM public.registrations r
    JOIN public.events e ON e.id = r.event_id
    WHERE (
      (v_user.role = 'admin' AND (p_event IS NULL OR trim(p_event) = '' OR e.name = p_event))
      OR
      (v_user.role = 'coordinator' AND e.name = ANY(v_user.assigned_events) AND (p_event IS NULL OR trim(p_event) = '' OR e.name = p_event))
    )
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 4. Payment Verification (ACCEPT / REJECT) RPC preserving payment_proof_path and utr_number
CREATE OR REPLACE FUNCTION public.verify_payment_and_registration(
  p_token TEXT,
  p_registration_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
  v_reg RECORD;
  v_event_name TEXT;
  v_action TEXT;
  v_pay RECORD;
BEGIN
  -- Authenticate session
  SELECT * INTO v_session
  FROM public.app_sessions
  WHERE token = p_token AND expires_at > now()
  LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Invalid or expired session');
  END IF;

  SELECT * INTO v_user
  FROM public.coordinators
  WHERE id = v_session.user_id AND is_active = true
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Account disabled');
  END IF;

  -- Fetch registration and event name
  SELECT r.*, e.name AS event_name INTO v_reg
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.id = p_registration_id;

  IF v_reg IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Registration not found');
  END IF;

  -- Permission check: Admin or assigned coordinator
  IF v_user.role != 'admin' AND NOT (v_reg.event_name = ANY(v_user.assigned_events)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You are not assigned to this event');
  END IF;

  -- Fetch payment record (or prepare to create one if not yet present)
  SELECT * INTO v_pay
  FROM public.payments
  WHERE registration_id = p_registration_id
  ORDER BY created_at DESC
  LIMIT 1;

  v_action := upper(trim(p_action));

  IF v_action = 'ACCEPT' THEN
    UPDATE public.registrations
    SET registration_status = 'ACCEPTED'
    WHERE id = p_registration_id;

    IF v_pay IS NULL THEN
      INSERT INTO public.payments (
        registration_id,
        amount,
        payment_status,
        remarks,
        verified_at,
        verified_by,
        utr_number
      ) VALUES (
        p_registration_id,
        v_reg.amount,
        'VERIFIED',
        'ADMIN_VERIFIED',
        now(),
        v_user.name,
        'DIRECT'
      ) RETURNING * INTO v_pay;
    ELSE
      UPDATE public.payments
      SET payment_status = 'VERIFIED',
          remarks = COALESCE(NULLIF(v_pay.remarks, ''), 'UPI'),
          verified_at = now(),
          verified_by = v_user.name
      WHERE id = v_pay.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'registration_status', 'ACCEPTED',
      'payment_status', 'VERIFIED',
      'remarks', COALESCE(v_pay.remarks, 'UPI'),
      'verified_at', now()
    );

  ELSIF v_action = 'REJECT' THEN
    UPDATE public.registrations
    SET registration_status = 'REJECTED'
    WHERE id = p_registration_id;

    IF v_pay IS NULL THEN
      INSERT INTO public.payments (
        registration_id,
        amount,
        payment_status,
        remarks,
        verified_at,
        verified_by,
        utr_number
      ) VALUES (
        p_registration_id,
        v_reg.amount,
        'FAILED',
        'REJECTED',
        now(),
        v_user.name,
        'REJECTED'
      ) RETURNING * INTO v_pay;
    ELSE
      UPDATE public.payments
      SET payment_status = 'FAILED',
          remarks = 'REJECTED',
          verified_at = now(),
          verified_by = v_user.name
      WHERE id = v_pay.id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'registration_status', 'REJECTED',
      'payment_status', 'FAILED',
      'remarks', 'REJECTED',
      'verified_at', now()
    );
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action. Must be ACCEPT or REJECT.');
  END IF;
END;
$$;
