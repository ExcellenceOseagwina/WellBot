create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  username text not null,
  matric_number text unique not null,
  password_hash text not null,
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
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table students enable row level security;
alter table conversations enable row level security;
alter table password_reset_requests enable row level security;
