-- ============================================================
-- intake_forms table
-- Student intake/assessment form linked to profiles
-- ============================================================

create table if not exists intake_forms (
  -- Identity
  id                          uuid primary key default gen_random_uuid(),
  student_profile_id          uuid references profiles(id) on delete cascade,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),

  -- Section 1: Basic Info
  full_name                   text,
  date_of_birth               date,
  sex                         text,               -- Male / Female / Other
  marital_status              text,
  profession                  text,
  education                   text,
  address                     text,
  pin_code                    text,
  phone                       text,
  email                       text,
  source                      text,               -- Walk-in / Referral / Social Media / Website / WhatsApp / Other
  registration_date           date,

  -- Section 2: Program
  course                      text,
  previous_yoga_experience    boolean,
  previous_yoga_details       text,
  protocol_assigned           text,
  practices_prescribed        text,

  -- Section 3: Health Background
  current_conditions          boolean,
  current_conditions_details  text,
  chief_complaints            text,
  history_of_illness          text,
  past_history                text,
  family_history              text,

  -- Section 4: Lifestyle
  food_type                   text,               -- Vegetarian / Non-vegetarian
  appetite                    text,               -- Normal / Poor
  sleep                       text,               -- Normal / Disturbed
  waking_time                 text,
  bowels                      text,               -- Normal / Constipation / Loose
  bladder                     text,               -- Normal / Intermittent
  smoking                     boolean,
  alcohol                     boolean,
  exercise_pattern            text,

  -- Section 5: NYG Assessment
  favourite_colour            text,
  favourite_taste             text,
  preferred_number_1          integer,
  preferred_number_2          integer,

  -- Section 6: Vitals
  height_cm                   numeric,
  weight_kg                   numeric,
  bmi                         numeric generated always as (
                                round(weight_kg / ((height_cm / 100.0) ^ 2), 2)
                              ) stored,
  pulse_bpm                   integer,
  systolic_bp                 integer,
  diastolic_bp                integer,
  respiratory_rate            integer
);

-- ============================================================
-- Trigger: auto-update updated_at on every row update
-- ============================================================

create or replace function update_intake_forms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_intake_forms_updated_at
  before update on intake_forms
  for each row
  execute function update_intake_forms_updated_at();

-- ============================================================
-- RLS Policies
-- ============================================================

alter table intake_forms enable row level security;

-- Admin: full read access
create policy "Admin can select intake_forms"
  on intake_forms
  for select
  to authenticated
  using (is_admin());

-- Admin: insert
create policy "Admin can insert intake_forms"
  on intake_forms
  for insert
  to authenticated
  with check (is_admin());

-- Admin: update
create policy "Admin can update intake_forms"
  on intake_forms
  for update
  to authenticated
  using (is_admin())
  with check (is_admin());
