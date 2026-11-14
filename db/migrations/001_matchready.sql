-- MatchReady schema. Real event, synthetic people and companies.
-- Rules baked in: no score/rank columns anywhere; identity stored apart from applications;
-- every selection decision is a row in `decisions`; feedback is per meeting, aggregated only.

CREATE TABLE events (
  id                   text PRIMARY KEY,
  name                 text NOT NULL,
  starts_on            date NOT NULL,
  ends_on              date NOT NULL,
  format               text NOT NULL,
  fields               text[] NOT NULL,          -- set by organisers, e.g. {Photonics,...}
  company_deadline     date NOT NULL,
  application_deadline date NOT NULL,
  decision_date        date NOT NULL,
  info_url             text
);

CREATE TABLE companies (
  id         text PRIMARY KEY,
  event_id   text NOT NULL REFERENCES events(id),
  name       text NOT NULL,
  website    text,
  field      text,                               -- one of events.fields
  synthetic  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_cards (
  company_id   text PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  goals        text[] NOT NULL DEFAULT '{}',     -- fill | explore | brand
  summary      text,
  event_goal   text,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  places       int  NOT NULL DEFAULT 8 CHECK (places > 0),
  source_text  text,                             -- the company's original input, kept as sent
  draft_json   jsonb,                            -- AI draft with field status + quotes
  confirmed_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id                   text PRIMARY KEY,
  company_id           text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title                text NOT NULL,
  details              text,                     -- "full-time · Espoo"
  conversation_starter text,                     -- goes to the meeting, never used for selection
  position             int  NOT NULL DEFAULT 0
);

CREATE TABLE requirements (
  id        text PRIMARY KEY,
  role_id   text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  type      text NOT NULL CHECK (type IN ('experience', 'has_done', 'education', 'language')),
  label     text NOT NULL,                       -- experience/has_done: area or task; education: degree level; language: language
  min_years numeric,                             -- experience only
  level     text,                                -- language: CEFR (A1..C2)
  detail    text,                                -- education: fields of study
  must_have boolean NOT NULL DEFAULT false,
  position  int NOT NULL DEFAULT 0
);

-- Candidates are pseudonymous. `code` is the blind ID organisers see (e.g. A-07).
CREATE TABLE candidates (
  id         text PRIMARY KEY,
  event_id   text NOT NULL REFERENCES events(id),
  code       text NOT NULL UNIQUE,
  synthetic  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Restricted: never joined into organiser review queries.
CREATE TABLE candidate_identity (
  candidate_id text PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  email        text NOT NULL
);

CREATE TABLE pool_profiles (
  candidate_id text PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  fields       text[] NOT NULL,
  work_type    text NOT NULL,
  career_stage text NOT NULL CHECK (career_stage IN ('student', 'early', 'experienced', 'senior')),
  languages    jsonb NOT NULL,                   -- [{"language":"English","level":"C1"}]
  joined_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE consents (
  id           bigserial PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  purpose      text NOT NULL CHECK (purpose IN ('event', 'talent_pool')),
  granted_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,                      -- talent_pool: 12 months
  withdrawn_at timestamptz,
  UNIQUE (candidate_id, purpose)
);

CREATE TABLE candidate_documents (
  candidate_id     text PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  cv_text          text,                         -- original CV text
  cv_facts         jsonb,                        -- structured: experience / education / languages / skills
  linkedin_url     text,
  linkedin_facts   jsonb,                        -- demo stand-in for the live profile (synthetic)
  linkedin_checks  jsonb,                        -- [{kind: match|differs|not_found, text}] computed by code
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Aggregate-only facts for the bias check. Never shown per person in review screens.
CREATE TABLE candidate_background (
  candidate_id   text PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  finnish_speaker boolean NOT NULL,
  has_degree      boolean NOT NULL,
  career_changer  boolean NOT NULL
);

CREATE TABLE applications (
  id            text PRIMARY KEY,
  candidate_id  text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id    text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_id       text REFERENCES roles(id) ON DELETE SET NULL,
  available     boolean NOT NULL,
  starter_answer text,                           -- conversation starter: goes to the meeting, not used for selection
  status        text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'declined')),
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, company_id)
);

-- One row per requirement per application: where the candidate shows it, and from which source.
CREATE TABLE evidence (
  id             bigserial PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  requirement_id text NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  value          text,                           -- "3 y 5 m · Valo Optics"
  meets          boolean,                        -- does the stated fact cover the requirement (true / false / null = unknown)
  source         text NOT NULL CHECK (source IN ('cv', 'profile', 'stated', 'none')),
  proof_type     text CHECK (proof_type IN ('diploma', 'certificate', 'link', 'reference')),
  proof_ref      text,
  linkedin_match boolean,                        -- experience rows: CV and LinkedIn agree
  UNIQUE (application_id, requirement_id)
);

CREATE TABLE decisions (
  id             bigserial PRIMARY KEY,
  application_id text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  organiser      text NOT NULL,
  action         text NOT NULL CHECK (action IN ('approve', 'decline', 'undo')),
  note           text,
  batch          boolean NOT NULL DEFAULT false,
  rule           text,                           -- e.g. 'must-haves met, nothing to check'
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Metric 1: organiser minutes per filled place.
CREATE TABLE review_sessions (
  id         bigserial PRIMARY KEY,
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  organiser  text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_action_at timestamptz
);

-- Metric 2: both sides want to continue. Per meeting; shown only as aggregates.
CREATE TABLE meeting_feedback (
  id                bigserial PRIMARY KEY,
  application_id    text NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  side              text NOT NULL CHECK (side IN ('company', 'candidate')),
  wants_to_continue boolean NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, side)
);

CREATE INDEX applications_company_idx ON applications (company_id);
CREATE INDEX decisions_application_idx ON decisions (application_id);
CREATE INDEX evidence_application_idx ON evidence (application_id);
