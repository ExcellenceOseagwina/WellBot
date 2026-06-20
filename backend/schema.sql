create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text not null,
  matric_number text unique not null,
  password_hash text not null,
  email_verified boolean not null default false,
  email_verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  question text not null,
  answer text not null,
  confidence numeric not null,
  category text,
  tokens jsonb,
  score_breakdown jsonb,
  suggestions jsonb,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table students enable row level security;
alter table conversations enable row level security;
alter table password_reset_requests enable row level security;
alter table email_verification_tokens enable row level security;

-- Migration helpers for existing databases (safe to re-run)
alter table students add column if not exists email_verified boolean not null default false;
alter table students add column if not exists email_verified_at timestamptz;
alter table password_reset_requests add column if not exists token_hash text;
alter table password_reset_requests add column if not exists expires_at timestamptz;
alter table password_reset_requests add column if not exists used_at timestamptz;
alter table password_reset_requests add column if not exists handled boolean not null default false;
alter table email_verification_tokens add column if not exists token_hash text;
alter table email_verification_tokens add column if not exists expires_at timestamptz;
alter table email_verification_tokens add column if not exists used_at timestamptz;

create index if not exists idx_password_reset_requests_token_hash
  on password_reset_requests(token_hash);

create index if not exists idx_email_verification_tokens_token_hash
  on email_verification_tokens(token_hash);
