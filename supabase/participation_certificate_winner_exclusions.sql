-- ============================================================
-- NEXTRON 2026
-- Prize-winner exclusion from online participation certificates
--
-- Prize winners receive their certificate offline.
-- Therefore:
--   PRESENT + winner     -> no participation certificate
--   PRESENT + nonwinner  -> participation certificate candidate
-- ============================================================

CREATE TABLE IF NOT EXISTS public.member_prize_winners (
  member_id UUID PRIMARY KEY
    REFERENCES public.members(id)
    ON DELETE CASCADE,

  marked_by UUID
    REFERENCES public.coordinators(id)
    ON DELETE SET NULL,

  marked_by_name TEXT NOT NULL,

  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_prize_winners_marked_at
  ON public.member_prize_winners(marked_at);

ALTER TABLE public.member_prize_winners ENABLE ROW LEVEL SECURITY;

REVOKE ALL
ON TABLE public.member_prize_winners
FROM anon, authenticated;


-- ============================================================
-- MARK / UNMARK PRIZE WINNER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_member_prize_winner(
  p_token TEXT,
  p_member_id UUID,
  p_is_winner BOOLEAN
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
    m.full_name,
    r.registration_number,
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

  IF NOT p_is_winner THEN
    DELETE FROM public.member_prize_winners
    WHERE member_id = p_member_id;

    RETURN jsonb_build_object(
      'success', true,
      'member_id', p_member_id,
      'is_prize_winner', false,
      'message', 'Prize winner status removed'
    );
  END IF;

  INSERT INTO public.member_prize_winners (
    member_id,
    marked_by,
    marked_by_name,
    marked_at,
    created_at
  )
  VALUES (
    p_member_id,
    v_user.id,
    v_user.name,
    now(),
    now()
  )
  ON CONFLICT (member_id)
  DO UPDATE SET
    marked_by = EXCLUDED.marked_by,
    marked_by_name = EXCLUDED.marked_by_name,
    marked_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id,
    'member_name', v_member.full_name,
    'registration_number', v_member.registration_number,
    'event', v_member.event_name,
    'is_prize_winner', true,
    'marked_by', v_user.name,
    'marked_at', now()
  );
END;
$$;

REVOKE ALL
ON FUNCTION public.set_member_prize_winner(TEXT, UUID, BOOLEAN)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.set_member_prize_winner(TEXT, UUID, BOOLEAN)
TO anon, authenticated;


-- ============================================================
-- Extend scoped registrations with attendance + prize status
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
              'attendance_marked_by', ma.marked_by_name,

              'is_prize_winner',
                (mpw.member_id IS NOT NULL),

              'prize_winner_marked_at',
                mpw.marked_at,

              'prize_winner_marked_by',
                mpw.marked_by_name
            )
            ORDER BY m.member_number ASC
          )
          FROM public.members m

          LEFT JOIN public.member_attendance ma
            ON ma.member_id = m.id

          LEFT JOIN public.member_prize_winners mpw
            ON mpw.member_id = m.id

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
