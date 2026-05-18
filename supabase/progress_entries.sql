-- ============================================================
-- progress_entries table
-- Periodic health/vitals snapshots for student progress tracking
-- ============================================================

create table if not exists progress_entries (
  id                  uuid primary key default gen_random_uuid(),
  student_profile_id  uuid references profiles(id) on delete cascade,
  recorded_at         date not null,
  label               text,                     -- e.g. Intake, 1 Month, 3 Months
  pulse_bpm           integer,
  systolic_bp         integer,
  diastolic_bp        integer,
  respiratory_rate    integer,
  bhramari_time_sec   integer,
  height_cm           numeric,
  weight_kg           numeric,
  bmi                 numeric generated always as (
                        round((weight_kg / ((height_cm / 100) ^ 2))::numeric, 2)
                      ) stored,
  symptom_score       integer,                  -- 1 (none) to 10 (severe)
  notes               text,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table progress_entries enable row level security;

create policy "Admin can select progress_entries"
  on progress_entries for select
  to authenticated
  using (is_admin());

create policy "Admin can insert progress_entries"
  on progress_entries for insert
  to authenticated
  with check (is_admin());

create policy "Admin can update progress_entries"
  on progress_entries for update
  to authenticated
  using (is_admin())
  with check (is_admin());
