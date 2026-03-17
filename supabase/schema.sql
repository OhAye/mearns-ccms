-- ============================================================
-- Mearns FA CCMS - Full Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS coaches (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  first_name              text NOT NULL,
  last_name               text NOT NULL,
  email                   text UNIQUE NOT NULL,
  phone                   text,
  role                    text NOT NULL CHECK (role IN ('Head Coach', 'Assistant Coach', 'Goalkeeper Coach', 'Welfare Officer')),
  team_years              text[] NOT NULL DEFAULT '{}',
  joined_date             date,
  status                  text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'active', 'inactive')),
  invite_token            uuid DEFAULT gen_random_uuid(),
  invite_token_expires_at timestamptz,
  is_admin                boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS certifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  coach_id         uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  cert_type        text NOT NULL CHECK (cert_type IN (
    'SFA Level 1',
    'SFA Level 2',
    'UEFA C Licence',
    'Introduction to Coaching 1.1',
    'Children''s Coaching Certificate 1.2',
    'SFA Goalkeeping L1',
    'First Aid'
  )),
  issued_date      date,
  expiry_date      date,
  comet_registered boolean NOT NULL DEFAULT false,
  notes            text
);

CREATE TABLE IF NOT EXISTS pvg_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  coach_id         uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  pvg_status       text NOT NULL DEFAULT 'not_started' CHECK (pvg_status IN ('not_started', 'pending', 'active', 'expired')),
  application_date date,
  approval_date    date,
  expiry_date      date,
  pvg_number       text,
  id_verified      boolean NOT NULL DEFAULT false,
  notes            text
);

CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  coach_id     uuid NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  step         integer NOT NULL,
  step_name    text NOT NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes        text,
  UNIQUE (coach_id, step)
);

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaches_updated_at
  BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER certifications_updated_at
  BEFORE UPDATE ON certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pvg_records_updated_at
  BEFORE UPDATE ON pvg_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER onboarding_checklist_updated_at
  BEFORE UPDATE ON onboarding_checklist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION + TRIGGER: create_onboarding_steps
-- ============================================================

CREATE OR REPLACE FUNCTION create_onboarding_steps(p_coach_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO onboarding_checklist (coach_id, step, step_name) VALUES
    (p_coach_id, 1,  'Self-registration form submitted'),
    (p_coach_id, 2,  'Profile reviewed and approved by admin'),
    (p_coach_id, 3,  'SFA COMET registration completed by CDO'),
    (p_coach_id, 4,  'MyComet account created by coach'),
    (p_coach_id, 5,  'Children''s Wellbeing e-learning completed'),
    (p_coach_id, 6,  'Mental Health e-learning completed'),
    (p_coach_id, 7,  'Self declaration completed'),
    (p_coach_id, 8,  'Introduction to Coaching (1.1) completed'),
    (p_coach_id, 9,  'PVG application initiated'),
    (p_coach_id, 10, 'PVG approved and active');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_create_onboarding_steps()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_onboarding_steps(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coaches_create_onboarding
  AFTER INSERT ON coaches
  FOR EACH ROW EXECUTE FUNCTION trigger_create_onboarding_steps();

-- ============================================================
-- RPC: register_coach_with_token
-- ============================================================

CREATE OR REPLACE FUNCTION register_coach_with_token(
  p_token      uuid,
  p_first_name text,
  p_last_name  text,
  p_email      text,
  p_phone      text,
  p_role       text,
  p_team_years text[]
) RETURNS jsonb AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  -- Find coach with valid token
  SELECT id INTO v_coach_id
  FROM coaches
  WHERE invite_token = p_token
    AND invite_token_expires_at > now()
  LIMIT 1;

  IF v_coach_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite link is invalid or has expired.');
  END IF;

  -- Check email not already taken by a different coach
  IF EXISTS (
    SELECT 1 FROM coaches
    WHERE email = p_email AND id <> v_coach_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A coach with that email address already exists.');
  END IF;

  -- Update the coach record
  UPDATE coaches SET
    first_name              = p_first_name,
    last_name               = p_last_name,
    email                   = p_email,
    phone                   = p_phone,
    role                    = p_role,
    team_years              = p_team_years,
    status                  = 'pending_review',
    invite_token_expires_at = now() - interval '1 second' -- Expire token immediately after use
  WHERE id = v_coach_id;

  -- Mark onboarding step 1 as complete
  UPDATE onboarding_checklist SET
    completed    = true,
    completed_at = now()
  WHERE coach_id = v_coach_id AND step = 1;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW certifications_with_status AS
SELECT
  *,
  CASE
    WHEN expiry_date IS NULL           THEN 'valid'
    WHEN expiry_date < CURRENT_DATE    THEN 'expired'
    WHEN expiry_date <= CURRENT_DATE + interval '60 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS status
FROM certifications;

CREATE OR REPLACE VIEW pvg_records_with_status AS
SELECT
  id,
  created_at,
  updated_at,
  coach_id,
  CASE
    WHEN pvg_status = 'active' AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE
      THEN 'expired'
    ELSE pvg_status
  END AS pvg_status,
  application_date,
  approval_date,
  expiry_date,
  pvg_number,
  id_verified,
  notes
FROM pvg_records;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE coaches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pvg_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- coaches: authenticated full CRUD, anon can insert with valid token (handled by RPC with SECURITY DEFINER)
CREATE POLICY "coaches_authenticated_crud" ON coaches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "coaches_anon_insert_via_rpc" ON coaches
  FOR INSERT TO anon WITH CHECK (false); -- Inserts from anon done via RPC SECURITY DEFINER only

-- certifications: authenticated full CRUD
CREATE POLICY "certifications_authenticated_crud" ON certifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pvg_records: authenticated full CRUD
CREATE POLICY "pvg_records_authenticated_crud" ON pvg_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- onboarding_checklist: authenticated select + update
CREATE POLICY "onboarding_authenticated_select" ON onboarding_checklist
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "onboarding_authenticated_update" ON onboarding_checklist
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Helper: Insert coaches then add certifications + PVG.
-- The onboarding_checklist rows are auto-created by trigger.
-- For compliant coaches we update steps to completed=true after insert.

-- ========================
-- COMPLIANT COACHES (4)
-- ========================

-- Coach 1: Alasdair MacGregor - Head Coach, 2014s (fully compliant)
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Alasdair', 'MacGregor', 'alasdair.macgregor@mearnsfa.com', '+44 7700 111001', 'Head Coach', ARRAY['2014s'], (now() - interval '3 years')::date, 'active', true);

-- Coach 2: Fiona Stewart - Assistant Coach, 2015s (fully compliant)
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Fiona', 'Stewart', 'fiona.stewart@mearnsfa.com', '+44 7700 111002', 'Assistant Coach', ARRAY['2015s'], (now() - interval '2 years 6 months')::date, 'active', false);

-- Coach 3: Callum Robertson - Head Coach, 2016s (fully compliant)
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Callum', 'Robertson', 'callum.robertson@mearnsfa.com', '+44 7700 111003', 'Head Coach', ARRAY['2016s'], (now() - interval '4 years')::date, 'active', false);

-- Coach 4: Morag Campbell - Welfare Officer, 2014s + 2015s (fully compliant, multi-team)
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Morag', 'Campbell', 'morag.campbell@mearnsfa.com', '+44 7700 111004', 'Welfare Officer', ARRAY['2014s', '2015s'], (now() - interval '2 years')::date, 'active', false);

-- ========================
-- ACTION REQUIRED COACHES (4)
-- ========================

-- Coach 5: Gregor Thomson - Cert expiring in 45 days
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Gregor', 'Thomson', 'gregor.thomson@mearnsfa.com', '+44 7700 111005', 'Assistant Coach', ARRAY['2017s'], (now() - interval '18 months')::date, 'active', false);

-- Coach 6: Catriona MacDonald - PVG pending
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Catriona', 'MacDonald', 'catriona.macdonald@mearnsfa.com', '+44 7700 111006', 'Head Coach', ARRAY['2018s'], (now() - interval '8 months')::date, 'active', false);

-- Coach 7: Euan Murray - Onboarding incomplete (missing step 6+)
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Euan', 'Murray', 'euan.murray@mearnsfa.com', '+44 7700 111007', 'Goalkeeper Coach', ARRAY['2016s'], (now() - interval '6 months')::date, 'active', false);

-- Coach 8: Shona Fraser - PVG expiring in 45 days
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Shona', 'Fraser', 'shona.fraser@mearnsfa.com', '+44 7700 111008', 'Assistant Coach', ARRAY['2019s'], (now() - interval '2 years')::date, 'active', false);

-- ========================
-- NON-COMPLIANT COACHES (4)
-- ========================

-- Coach 9: Hamish Reid - No PVG at all
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Hamish', 'Reid', 'hamish.reid@mearnsfa.com', '+44 7700 111009', 'Assistant Coach', ARRAY['2017s'], (now() - interval '3 months')::date, 'active', false);

-- Coach 10: Isla Anderson - Expired PVG
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Isla', 'Anderson', 'isla.anderson@mearnsfa.com', '+44 7700 111010', 'Head Coach', ARRAY['2018s'], (now() - interval '5 years')::date, 'active', false);

-- Coach 11: Ross Mackenzie - No certs at all
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Ross', 'Mackenzie', 'ross.mackenzie@mearnsfa.com', '+44 7700 111011', 'Assistant Coach', ARRAY['2019s'], (now() - interval '1 month')::date, 'active', false);

-- Coach 12: Aileen Burns - All certs expired
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Aileen', 'Burns', 'aileen.burns@mearnsfa.com', '+44 7700 111012', 'Assistant Coach', ARRAY['2017s'], (now() - interval '6 years')::date, 'active', false);

-- ========================
-- PENDING REVIEW COACHES (2)
-- ========================

-- Coach 13: Lachlan Scott - just registered
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Lachlan', 'Scott', 'lachlan.scott@mearnsfa.com', '+44 7700 111013', 'Assistant Coach', ARRAY['2015s'], null, 'pending_review', false);

-- Coach 14: Kirsty Wilson - just registered
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Kirsty', 'Wilson', 'kirsty.wilson@mearnsfa.com', '+44 7700 111014', 'Head Coach', ARRAY['2019s'], null, 'pending_review', false);

-- Coach 15: Duncan Paterson - multi-team, action required (cert expiring)
INSERT INTO coaches (first_name, last_name, email, phone, role, team_years, joined_date, status, is_admin)
VALUES ('Duncan', 'Paterson', 'duncan.paterson@mearnsfa.com', '+44 7700 111015', 'Head Coach', ARRAY['2014s', '2016s', '2018s'], (now() - interval '3 years')::date, 'active', false);

-- ============================================================
-- CERTIFICATIONS
-- ============================================================

-- Alasdair MacGregor (compliant) - valid certs
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 2', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'alasdair.macgregor@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'alasdair.macgregor@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'Introduction to Coaching 1.1', (now() - interval '2 years')::date, (now() + interval '1 year')::date, true FROM coaches WHERE email = 'alasdair.macgregor@mearnsfa.com';

-- Fiona Stewart (compliant) - valid certs
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '2 years')::date, (now() + interval '1 year')::date, true FROM coaches WHERE email = 'fiona.stewart@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '6 months')::date, (now() + interval '2 years 6 months')::date, true FROM coaches WHERE email = 'fiona.stewart@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'Children''s Coaching Certificate 1.2', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'fiona.stewart@mearnsfa.com';

-- Callum Robertson (compliant)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'UEFA C Licence', (now() - interval '3 years')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'callum.robertson@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'callum.robertson@mearnsfa.com';

-- Morag Campbell (compliant)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'morag.campbell@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'Children''s Coaching Certificate 1.2', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'morag.campbell@mearnsfa.com';

-- Gregor Thomson (action required - cert expiring in 45 days)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '3 years')::date, (now() + interval '45 days')::date, true FROM coaches WHERE email = 'gregor.thomson@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'gregor.thomson@mearnsfa.com';

-- Catriona MacDonald (action required - PVG pending)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 2', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'catriona.macdonald@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '6 months')::date, (now() + interval '2 years 6 months')::date, true FROM coaches WHERE email = 'catriona.macdonald@mearnsfa.com';

-- Euan Murray (action required - onboarding incomplete; valid certs and PVG)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'euan.murray@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Goalkeeping L1', (now() - interval '6 months')::date, (now() + interval '2 years 6 months')::date, true FROM coaches WHERE email = 'euan.murray@mearnsfa.com';

-- Shona Fraser (action required - PVG expiring in 45 days)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '2 years')::date, (now() + interval '1 year')::date, true FROM coaches WHERE email = 'shona.fraser@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '6 months')::date, (now() + interval '2 years 6 months')::date, true FROM coaches WHERE email = 'shona.fraser@mearnsfa.com';

-- Hamish Reid (non-compliant - no PVG; has cert)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '1 year')::date, (now() + interval '2 years')::date, false FROM coaches WHERE email = 'hamish.reid@mearnsfa.com';

-- Isla Anderson (non-compliant - expired PVG; has valid cert)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '1 year')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'isla.anderson@mearnsfa.com';

-- Ross Mackenzie: no certs (non-compliant)

-- Aileen Burns (non-compliant - all certs expired)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'SFA Level 1', (now() - interval '4 years')::date, (now() - interval '10 days')::date, false FROM coaches WHERE email = 'aileen.burns@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '3 years')::date, (now() - interval '6 months')::date, false FROM coaches WHERE email = 'aileen.burns@mearnsfa.com';

-- Lachlan Scott (pending review - no certs yet)
-- Kirsty Wilson (pending review - no certs yet)

-- Duncan Paterson (multi-team, cert expiring soon)
INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'UEFA C Licence', (now() - interval '3 years')::date, (now() + interval '2 years')::date, true FROM coaches WHERE email = 'duncan.paterson@mearnsfa.com';

INSERT INTO certifications (coach_id, cert_type, issued_date, expiry_date, comet_registered)
SELECT id, 'First Aid', (now() - interval '3 years')::date, (now() + interval '45 days')::date, true FROM coaches WHERE email = 'duncan.paterson@mearnsfa.com';

-- ============================================================
-- PVG RECORDS
-- ============================================================

-- Alasdair MacGregor (compliant - active PVG, far future)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '2 years')::date, (now() - interval '2 years' + interval '14 days')::date, (now() + interval '2 years')::date, 'PVG2021001234', true FROM coaches WHERE email = 'alasdair.macgregor@mearnsfa.com';

-- Fiona Stewart (compliant)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '18 months')::date, (now() - interval '18 months' + interval '10 days')::date, (now() + interval '18 months')::date, 'PVG2022005678', true FROM coaches WHERE email = 'fiona.stewart@mearnsfa.com';

-- Callum Robertson (compliant)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '3 years')::date, (now() - interval '3 years' + interval '7 days')::date, (now() + interval '2 years')::date, 'PVG2020009012', true FROM coaches WHERE email = 'callum.robertson@mearnsfa.com';

-- Morag Campbell (compliant)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '2 years')::date, (now() - interval '2 years' + interval '12 days')::date, (now() + interval '2 years')::date, 'PVG2021003456', true FROM coaches WHERE email = 'morag.campbell@mearnsfa.com';

-- Gregor Thomson (action required - active PVG, cert expiring)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '1 year')::date, (now() - interval '1 year' + interval '14 days')::date, (now() + interval '2 years')::date, 'PVG2023001111', true FROM coaches WHERE email = 'gregor.thomson@mearnsfa.com';

-- Catriona MacDonald (action required - PVG pending)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'pending', (now() - interval '3 weeks')::date, null, null, null, false FROM coaches WHERE email = 'catriona.macdonald@mearnsfa.com';

-- Euan Murray (action required - valid PVG, onboarding incomplete)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '5 months')::date, (now() - interval '5 months' + interval '10 days')::date, (now() + interval '2 years 7 months')::date, 'PVG2023007890', true FROM coaches WHERE email = 'euan.murray@mearnsfa.com';

-- Shona Fraser (action required - PVG expiring in 45 days)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '3 years')::date, (now() - interval '3 years' + interval '14 days')::date, (now() + interval '45 days')::date, 'PVG2020002222', true FROM coaches WHERE email = 'shona.fraser@mearnsfa.com';

-- Hamish Reid: NO PVG record (non-compliant)

-- Isla Anderson (non-compliant - expired PVG: expiry 10 days ago)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '3 years')::date, (now() - interval '3 years' + interval '14 days')::date, (now() - interval '10 days')::date, 'PVG2019004444', true FROM coaches WHERE email = 'isla.anderson@mearnsfa.com';

-- Ross Mackenzie: no PVG (non-compliant)

-- Aileen Burns (non-compliant - expired PVG)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'expired', (now() - interval '5 years')::date, (now() - interval '5 years' + interval '10 days')::date, (now() - interval '2 years')::date, 'PVG2017006666', false FROM coaches WHERE email = 'aileen.burns@mearnsfa.com';

-- Duncan Paterson (multi-team, action required - cert expiring, PVG valid)
INSERT INTO pvg_records (coach_id, pvg_status, application_date, approval_date, expiry_date, pvg_number, id_verified)
SELECT id, 'active', (now() - interval '2 years')::date, (now() - interval '2 years' + interval '10 days')::date, (now() + interval '2 years')::date, 'PVG2021008888', true FROM coaches WHERE email = 'duncan.paterson@mearnsfa.com';

-- ============================================================
-- UPDATE ONBOARDING STEPS FOR COMPLIANT COACHES
-- ============================================================
-- Mark all 10 steps complete for the 4 fully-compliant coaches

UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '6 months')
WHERE coach_id IN (
  SELECT id FROM coaches WHERE email IN (
    'alasdair.macgregor@mearnsfa.com',
    'fiona.stewart@mearnsfa.com',
    'callum.robertson@mearnsfa.com',
    'morag.campbell@mearnsfa.com'
  )
);

-- Gregor Thomson: all steps complete (action required is cert expiry only)
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '1 year')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'gregor.thomson@mearnsfa.com');

-- Catriona MacDonald: steps 1-8 complete, 9-10 pending (PVG in progress)
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '2 months')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'catriona.macdonald@mearnsfa.com')
  AND step <= 8;

-- Euan Murray: steps 1-5 complete, 6-10 pending (onboarding incomplete)
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '4 months')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'euan.murray@mearnsfa.com')
  AND step <= 5;

-- Shona Fraser: all steps complete (action required is PVG expiry only)
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '2 years')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'shona.fraser@mearnsfa.com');

-- Hamish Reid: steps 1-2 complete only
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '2 months')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'hamish.reid@mearnsfa.com')
  AND step <= 2;

-- Isla Anderson: all steps complete (but PVG expired)
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '4 years')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'isla.anderson@mearnsfa.com');

-- Aileen Burns: all steps complete (but PVG and certs expired)
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '5 years')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'aileen.burns@mearnsfa.com');

-- Duncan Paterson: all steps complete
UPDATE onboarding_checklist SET completed = true, completed_at = (now() - interval '2 years')
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'duncan.paterson@mearnsfa.com');

-- Lachlan Scott: only step 1 complete (just registered)
UPDATE onboarding_checklist SET completed = true, completed_at = now()
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'lachlan.scott@mearnsfa.com')
  AND step = 1;

-- Kirsty Wilson: only step 1 complete (just registered)
UPDATE onboarding_checklist SET completed = true, completed_at = now()
WHERE coach_id = (SELECT id FROM coaches WHERE email = 'kirsty.wilson@mearnsfa.com')
  AND step = 1;
