-- ============================================================
-- Fix meetups + meetup_attendance RLS
-- Drop all existing policies and replace with direct role check
-- (avoids dependency on is_admin() function availability)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── meetups ──────────────────────────────────────────────────

drop policy if exists "Admin can select meetups" on meetups;
drop policy if exists "Admin can insert meetups" on meetups;
drop policy if exists "Admin can update meetups" on meetups;
drop policy if exists "Admin can delete meetups" on meetups;
drop policy if exists "Authenticated users can read meetups by event_code" on meetups;

-- Single policy: admins have full access
create policy "Admin full access on meetups"
  on meetups for all
  to authenticated
  using  ((select role from profiles where id = auth.uid()) = 'admin')
  with check ((select role from profiles where id = auth.uid()) = 'admin');

-- All authenticated users can read meetups (for self check-in lookup)
create policy "Authenticated users can read meetups"
  on meetups for select
  to authenticated
  using (true);

-- ── meetup_attendance ─────────────────────────────────────────

drop policy if exists "Admin can select meetup_attendance" on meetup_attendance;
drop policy if exists "Admin can insert meetup_attendance" on meetup_attendance;
drop policy if exists "Admin can update meetup_attendance" on meetup_attendance;
drop policy if exists "Admin can delete meetup_attendance" on meetup_attendance;
drop policy if exists "Authenticated users can self check-in" on meetup_attendance;

-- Single policy: admins have full access
create policy "Admin full access on meetup_attendance"
  on meetup_attendance for all
  to authenticated
  using  ((select role from profiles where id = auth.uid()) = 'admin')
  with check ((select role from profiles where id = auth.uid()) = 'admin');

-- Authenticated users can insert their own attendance (self check-in)
create policy "Authenticated users can self check-in"
  on meetup_attendance for insert
  to authenticated
  with check (student_profile_id = auth.uid());
