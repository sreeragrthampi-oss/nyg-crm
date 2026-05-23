-- ============================================================
-- meetups table
-- Bi-weekly sessions (online or offline) with self check-in support
-- ============================================================

create table if not exists meetups (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  date         timestamptz not null,
  type         text not null check (type in ('online', 'offline')),
  location     text,                              -- venue or link
  description  text,
  event_code   text not null unique,              -- short code for student self check-in
  xp_reward    integer not null default 50,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- meetup_attendance table
-- Tracks who attended each meetup; supports both students and walk-ins
-- ============================================================

create table if not exists meetup_attendance (
  id                  uuid primary key default gen_random_uuid(),
  meetup_id           uuid not null references meetups(id) on delete cascade,
  student_profile_id  uuid references profiles(id) on delete set null,  -- null for non-students
  name                text not null,
  phone               text,
  is_student          boolean not null default false,
  attended_at         timestamptz not null default now()
);

-- ============================================================
-- RLS Policies — meetups
-- ============================================================

alter table meetups enable row level security;

create policy "Admin can select meetups"
  on meetups for select
  to authenticated
  using (is_admin());

create policy "Admin can insert meetups"
  on meetups for insert
  to authenticated
  with check (is_admin());

create policy "Admin can update meetups"
  on meetups for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Admin can delete meetups"
  on meetups for delete
  to authenticated
  using (is_admin());

-- Allow authenticated users to read meetups by event_code (for self check-in)
create policy "Authenticated users can read meetups by event_code"
  on meetups for select
  to authenticated
  using (true);

-- ============================================================
-- RLS Policies — meetup_attendance
-- ============================================================

alter table meetup_attendance enable row level security;

create policy "Admin can select meetup_attendance"
  on meetup_attendance for select
  to authenticated
  using (is_admin());

create policy "Admin can insert meetup_attendance"
  on meetup_attendance for insert
  to authenticated
  with check (is_admin());

create policy "Admin can update meetup_attendance"
  on meetup_attendance for update
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Admin can delete meetup_attendance"
  on meetup_attendance for delete
  to authenticated
  using (is_admin());

-- Allow authenticated users to insert their own attendance (self check-in)
create policy "Authenticated users can self check-in"
  on meetup_attendance for insert
  to authenticated
  with check (student_profile_id = auth.uid());
