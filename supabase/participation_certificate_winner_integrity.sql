-- ============================================================
-- NEXTRON 2026
-- Keep attendance and prize-winner exclusion consistent.
--
-- Invariant:
--   Prize Winner => PRESENT
--
-- Changing attendance to ABSENT or CLEAR automatically removes
-- the prize-winner exclusion.
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

  IF v_user.role <> 'admin'
     AND NOT (v_member.event_name = ANY(v_user.assigned_events))
  THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: You are not assigned to this event'
    );
  END IF;

  v_status := upper(trim(COALESCE(p_status, '')));

  IF v_status = 'CLEAR' THEN

    DELETE FROM public.member_prize_winners
    WHERE member_id = p_member_id;

    DELETE FROM public.member_attendance
    WHERE member_id = p_member_id;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', p_member_id,
      'attendance_status', NULL,
      'is_prize_winner', false,
      'message', 'Attendance cleared'
    );
  END IF;

  IF v_status NOT IN ('PRESENT', 'ABSENT') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid attendance status. Use PRESENT, ABSENT, or CLEAR.'
    );
  END IF;

  -- A prize winner cannot remain marked ABSENT.
  IF v_status = 'ABSENT' THEN
    DELETE FROM public.member_prize_winners
    WHERE member_id = p_member_id;
  END IF;

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
    'is_prize_winner',
      EXISTS (
        SELECT 1
        FROM public.member_prize_winners
        WHERE member_id = p_member_id
      ),
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
