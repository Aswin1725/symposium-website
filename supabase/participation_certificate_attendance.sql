-- ============================================================
-- NEXTRON 2026
-- Member-level attendance foundation for participation certificates
--
-- Attendance belongs to an individual MEMBER, not a team registration.
-- Certificate eligibility will later depend on PRESENT attendance.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_attendance (
  member_id UUID PRIMARY KEY
    REFERENCES public.members(id)
    ON DELETE CASCADE,

  status TEXT NOT NULL
    CHECK (status IN ('PRESENT', 'ABSENT')),

  -- Keep the UUID when possible, but don't block coordinator deletion.
  marked_by UUID
    REFERENCES public.coordinators(id)
    ON DELETE SET NULL,

  -- Preserve the audit trail even if the coordinator account is deleted.
  marked_by_name TEXT NOT NULL,

  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_attendance_status
  ON public.member_attendance(status);

CREATE INDEX IF NOT EXISTS idx_member_attendance_marked_at
  ON public.member_attendance(marked_at);

-- No direct browser CRUD.
-- Attendance changes must pass through the authenticated RPC below.
ALTER TABLE public.member_attendance ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.member_attendance
FROM anon, authenticated;


-- ============================================================
-- SET / CHANGE / CLEAR MEMBER ATTENDANCE
--
-- p_status:
--   PRESENT
--   ABSENT
--   CLEAR
--
-- Admin can update any member.
-- Coordinator can update only members in assigned events.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_member_attendance(
  p_token TEXT,
  p_member_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
  v_member RECORD;
  v_status TEXT;
BEGIN
  -- ----------------------------------------------------------
  -- Authenticate session
  -- ----------------------------------------------------------

  SELECT *
  INTO v_session
  FROM public.app_sessions
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Invalid or expired session'
    );
  END IF;


  SELECT *
  INTO v_user
  FROM public.coordinators
  WHERE id = v_session.user_id
    AND is_active = true
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Account disabled'
    );
  END IF;


  -- ----------------------------------------------------------
  -- Resolve member -> registration -> event
  -- ----------------------------------------------------------

  SELECT
    m.id AS member_id,
    m.registration_id,
    m.full_name,
    r.registration_number,
    e.id AS event_id,
    e.name AS event_name
  INTO v_member
  FROM public.members m
  JOIN public.registrations r
    ON r.id = m.registration_id
  JOIN public.events e
    ON e.id = r.event_id
  WHERE m.id = p_member_id
  LIMIT 1;

  IF v_member IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member not found'
    );
  END IF;


  -- ----------------------------------------------------------
  -- Authorization
  -- ----------------------------------------------------------

  IF v_user.role <> 'admin'
     AND NOT (v_member.event_name = ANY(v_user.assigned_events))
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: You are not assigned to this event'
    );
  END IF;


  -- ----------------------------------------------------------
  -- Validate requested action
  -- ----------------------------------------------------------

  v_status := upper(trim(COALESCE(p_status, '')));

  IF v_status = 'CLEAR' THEN

    DELETE FROM public.member_attendance
    WHERE member_id = p_member_id;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', p_member_id,
      'attendance_status', NULL,
      'message', 'Attendance cleared'
    );

  END IF;


  IF v_status NOT IN ('PRESENT', 'ABSENT') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid attendance status. Use PRESENT, ABSENT, or CLEAR.'
    );
  END IF;


  -- ----------------------------------------------------------
  -- Insert / update attendance
  -- ----------------------------------------------------------

  INSERT INTO public.member_attendance (
    member_id,
    status,
    marked_by,
    marked_by_name,
    marked_at,
    created_at,
    updated_at
  )
  VALUES (
    p_member_id,
    v_status,
    v_user.id,
    v_user.name,
    now(),
    now(),
    now()
  )
  ON CONFLICT (member_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    marked_by = EXCLUDED.marked_by,
    marked_by_name = EXCLUDED.marked_by_name,
    marked_at = now(),
    updated_at = now();


  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id,
    'member_name', v_member.full_name,
    'registration_number', v_member.registration_number,
    'event', v_member.event_name,
    'attendance_status', v_status,
    'marked_by', v_user.name,
    'marked_at', now()
  );
END;
$$;


REVOKE ALL
ON FUNCTION public.set_member_attendance(TEXT, UUID, TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.set_member_attendance(TEXT, UUID, TEXT)
TO anon, authenticated;


-- ============================================================
-- Extend existing scoped registration RPC so the frontend gets
-- member IDs + attendance details in the same payload.
-- ============================================================

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
  SELECT *
  INTO v_session
  FROM public.app_sessions
  WHERE token = p_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
  END IF;


  SELECT *
  INTO v_user
  FROM public.coordinators
  WHERE id = v_session.user_id
    AND is_active = true
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Inactive account';
  END IF;


  SELECT jsonb_agg(
    r_data
    ORDER BY r_data->>'created_at' DESC
  )
  INTO v_result
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

      'members',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'member_number', m.member_number,
              'name', m.full_name,
              'phone', m.phone,
              'email', m.email,
              'id_card_path', m.id_card_path,

              'attendance_status', ma.status,
              'attendance_marked_at', ma.marked_at,
              'attendance_marked_by', ma.marked_by_name
            )
            ORDER BY m.member_number ASC
          )
          FROM public.members m
          LEFT JOIN public.member_attendance ma
            ON ma.member_id = m.id
          WHERE m.registration_id = r.id
        ),
        '[]'::jsonb
      ),

      'payment',
      (
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
    JOIN public.events e
      ON e.id = r.event_id

    WHERE
      (
        v_user.role = 'admin'
        AND (
          p_event IS NULL
          OR trim(p_event) = ''
          OR e.name = p_event
        )
      )

      OR

      (
        v_user.role = 'coordinator'
        AND e.name = ANY(v_user.assigned_events)
        AND (
          p_event IS NULL
          OR trim(p_event) = ''
          OR e.name = p_event
        )
      )

  ) sub;


  RETURN COALESCE(
    v_result,
    '[]'::jsonb
  );
END;
$$;
