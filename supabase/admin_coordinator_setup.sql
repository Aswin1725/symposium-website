-- Migration: Admin and Coordinator Authentication & Scoping
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Coordinators & Admin Table
CREATE TABLE IF NOT EXISTS public.coordinators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coordinator' CHECK (role IN ('admin', 'coordinator')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_events TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS public.app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.coordinators(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_token ON public.app_sessions(token);
CREATE INDEX IF NOT EXISTS idx_coordinators_email ON public.coordinators(lower(email));

-- 3. Login RPC
CREATE OR REPLACE FUNCTION public.app_login(
  p_login TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_token TEXT;
BEGIN
  -- Search by email or name/username (case-insensitive)
  SELECT * INTO v_user
  FROM public.coordinators
  WHERE lower(email) = lower(trim(p_login))
     OR lower(name) = lower(trim(p_login))
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username/email or password');
  END IF;

  IF NOT v_user.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account is disabled. Please contact administrator.');
  END IF;

  -- Validate password using crypt
  IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username/email or password');
  END IF;

  -- Generate session token
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.app_sessions (user_id, role, token, expires_at)
  VALUES (v_user.id, v_user.role, v_token, now() + interval '24 hours');

  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'role', v_user.role,
      'assigned_events', v_user.assigned_events
    )
  );
END;
$$;

-- 4. Session Validation RPC
CREATE OR REPLACE FUNCTION public.app_validate_session(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_user RECORD;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT * INTO v_session
  FROM public.app_sessions
  WHERE token = p_token AND expires_at > now()
  LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT * INTO v_user
  FROM public.coordinators
  WHERE id = v_session.user_id AND is_active = true
  LIMIT 1;

  IF v_user IS NULL THEN
    DELETE FROM public.app_sessions WHERE token = p_token;
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.name,
      'email', v_user.email,
      'role', v_user.role,
      'assigned_events', v_user.assigned_events
    )
  );
END;
$$;

-- 5. Logout RPC
CREATE OR REPLACE FUNCTION public.app_logout(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.app_sessions WHERE token = p_token;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Server-Scoped Registrations Fetch RPC
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
      -- If Admin: can query all or filter by event if provided
      (v_user.role = 'admin' AND (p_event IS NULL OR trim(p_event) = '' OR e.name = p_event))
      OR
      -- If Coordinator: MUST be in assigned_events, and if event specified, must also match
      (v_user.role = 'coordinator' AND e.name = ANY(v_user.assigned_events) AND (p_event IS NULL OR trim(p_event) = '' OR e.name = p_event))
    )
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 7. Payment Verification (ACCEPT / REJECT) RPC
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
  v_new_remarks TEXT;
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

  -- Fetch payment record
  SELECT * INTO v_pay
  FROM public.payments
  WHERE registration_id = p_registration_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_pay IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment record not found for this registration');
  END IF;

  v_action := upper(trim(p_action));

  IF v_action = 'ACCEPT' THEN
    UPDATE public.registrations
    SET registration_status = 'ACCEPTED'
    WHERE id = p_registration_id;

    UPDATE public.payments
    SET payment_status = 'VERIFIED',
        remarks = 'UPI',
        verified_at = now(),
        verified_by = v_user.name
    WHERE id = v_pay.id;

    RETURN jsonb_build_object(
      'success', true,
      'registration_status', 'ACCEPTED',
      'payment_status', 'VERIFIED',
      'remarks', 'UPI',
      'verified_at', now()
    );

  ELSIF v_action = 'REJECT' THEN
    UPDATE public.registrations
    SET registration_status = 'REJECTED'
    WHERE id = p_registration_id;

    UPDATE public.payments
    SET payment_status = 'FAILED',
        remarks = 'REJECTED',
        verified_at = now(),
        verified_by = v_user.name
    WHERE id = v_pay.id;

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

-- 8. Coordinator Management RPC (Admin only)
CREATE OR REPLACE FUNCTION public.admin_manage_coordinator(
  p_token TEXT,
  p_action TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_session RECORD;
  v_admin RECORD;
  v_coord_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_password TEXT;
  v_assigned_events TEXT[];
  v_is_active BOOLEAN;
  v_result JSONB;
BEGIN
  -- Authenticate admin session
  SELECT * INTO v_session
  FROM public.app_sessions
  WHERE token = p_token AND expires_at > now()
  LIMIT 1;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Invalid or expired session');
  END IF;

  SELECT * INTO v_admin
  FROM public.coordinators
  WHERE id = v_session.user_id AND role = 'admin' AND is_active = true
  LIMIT 1;

  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Actions
  IF p_action = 'list' THEN
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'email', c.email,
      'role', c.role,
      'is_active', c.is_active,
      'assigned_events', c.assigned_events,
      'created_at', c.created_at
    ) ORDER BY c.role DESC, c.name ASC) INTO v_result
    FROM public.coordinators c;

    RETURN jsonb_build_object('success', true, 'coordinators', COALESCE(v_result, '[]'::jsonb));

  ELSIF p_action = 'add' THEN
    v_name := trim(p_data->>'name');
    v_email := lower(trim(p_data->>'email'));
    v_password := p_data->>'password';
    
    IF v_name IS NULL OR v_name = '' OR v_email IS NULL OR v_email = '' OR v_password IS NULL OR v_password = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Name, email, and password are required');
    END IF;

    -- Extract events array
    SELECT COALESCE(array_agg(value::text), '{}') INTO v_assigned_events
    FROM jsonb_array_elements_text(COALESCE(p_data->'assigned_events', '[]'::jsonb));

    INSERT INTO public.coordinators (name, email, password_hash, role, is_active, assigned_events)
    VALUES (v_name, v_email, crypt(v_password, gen_salt('bf')), 'coordinator', true, v_assigned_events)
    RETURNING id INTO v_coord_id;

    RETURN jsonb_build_object('success', true, 'id', v_coord_id);

  ELSIF p_action = 'edit' THEN
    v_coord_id := (p_data->>'id')::uuid;
    v_name := trim(p_data->>'name');
    v_email := lower(trim(p_data->>'email'));
    v_password := p_data->>'password';

    SELECT COALESCE(array_agg(value::text), '{}') INTO v_assigned_events
    FROM jsonb_array_elements_text(COALESCE(p_data->'assigned_events', '[]'::jsonb));

    IF v_password IS NOT NULL AND trim(v_password) != '' THEN
      UPDATE public.coordinators
      SET name = COALESCE(v_name, name),
          email = COALESCE(v_email, email),
          password_hash = crypt(v_password, gen_salt('bf')),
          assigned_events = v_assigned_events,
          updated_at = now()
      WHERE id = v_coord_id AND role = 'coordinator';
    ELSE
      UPDATE public.coordinators
      SET name = COALESCE(v_name, name),
          email = COALESCE(v_email, email),
          assigned_events = v_assigned_events,
          updated_at = now()
      WHERE id = v_coord_id AND role = 'coordinator';
    END IF;

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'toggle_status' THEN
    v_coord_id := (p_data->>'id')::uuid;
    v_is_active := (p_data->>'is_active')::boolean;

    UPDATE public.coordinators
    SET is_active = v_is_active,
        updated_at = now()
    WHERE id = v_coord_id AND role = 'coordinator';

    -- If disabled, terminate active sessions
    IF NOT v_is_active THEN
      DELETE FROM public.app_sessions WHERE user_id = v_coord_id;
    END IF;

    RETURN jsonb_build_object('success', true);

  ELSIF p_action = 'delete' THEN
    v_coord_id := (p_data->>'id')::uuid;

    DELETE FROM public.coordinators
    WHERE id = v_coord_id AND role = 'coordinator';

    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown action');
  END IF;
END;
$$;

-- 9. Seed Initial Admin and Coordinators (using existing event list)
DO $$
BEGIN
  -- Insert Admin
  IF NOT EXISTS (SELECT 1 FROM public.coordinators WHERE role = 'admin') THEN
    INSERT INTO public.coordinators (name, email, password_hash, role, is_active, assigned_events)
    VALUES (
      'Admin',
      'admin@nextron.com',
      crypt('nextron@2026', gen_salt('bf')),
      'admin',
      true,
      '{}'
    );
  END IF;

  -- Insert initial coordinators matching existing events if empty
  IF (SELECT count(*) FROM public.coordinators WHERE role = 'coordinator') = 0 THEN
    INSERT INTO public.coordinators (name, email, password_hash, role, is_active, assigned_events) VALUES
      ('Paper Presentation Coordinator', 'paper', crypt('paper@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Paper Presentation']),
      ('Project Expo Coordinator', 'project', crypt('project@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Project Expo']),
      ('Code Debugging Coordinator', 'codedebug', crypt('code@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Code Debugging']),
      ('Tech Quiz Coordinator', 'techquiz', crypt('techquiz@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Tech Quiz']),
      ('Logo Design Coordinator', 'logodesign', crypt('logo@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Logo Design']),
      ('Ideathon Coordinator', 'ideathon', crypt('ideathon@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Ideathon']),
      ('Web Design Coordinator', 'webdesign', crypt('web@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Web Design']),
      ('Electro Charades Coordinator', 'electrocharades', crypt('electro@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Electro Charades']),
      ('AI Video Animation Coordinator', 'aivideo', crypt('aivideo@2026', gen_salt('bf')), 'coordinator', true, ARRAY['AI Video Animation & Generation']),
      ('Free Fire Coordinator', 'freefire', crypt('freefire@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Free Fire']),
      ('BGMI Coordinator', 'bgmi', crypt('bgmi@2026', gen_salt('bf')), 'coordinator', true, ARRAY['BGMI']),
      ('Photography Coordinator', 'photo', crypt('photo@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Photography']),
      ('Treasure Hunt Coordinator', 'treasure', crypt('treasure@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Treasure Hunt']),
      ('Reels Making Coordinator', 'reels', crypt('reels@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Reels Making']),
      ('Meme Making Coordinator', 'meme', crypt('meme@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Meme Making']),
      ('Cine Quiz Coordinator', 'cinequiz', crypt('cine@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Cine Quiz']),
      ('Act & Guess Coordinator', 'actguess', crypt('act@2026', gen_salt('bf')), 'coordinator', true, ARRAY['Act & Guess']);
  END IF;
END $$;
