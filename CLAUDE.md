# NYG CRM — Claude Code Context

## What this is
NYG CRM is a laptop-first web dashboard for Nirvana Yoga Global admins to manage leads, students, enrollments, fees, and Araiki attunements. It is a separate app from NYG Connect PWA but shares the same Supabase database.

## Live URLs
- Production: nyg-crm.vercel.app
- GitHub: github.com/sreeragrthampi-oss/nyg-crm
- Supabase: jlfmrligwbxklijugeui.supabase.co (same as NYG Connect)

## Tech Stack
- Frontend: React + Vite
- Styling: Tailwind CSS (install if not present)
- Database: Supabase (same project as NYG Connect)
- Routing: React Router DOM
- Charts: Recharts
- Hosting: Vercel

## Brand
- Primary blue: #1742b5
- Orange accent: #f97316
- Background: #f8fafc
- Tone: professional, clean, efficient — this is an admin tool

## Layout
- Sidebar navigation on the left (fixed, always visible)
- Main content area on the right
- Laptop optimized — minimum width 1024px
- No mobile optimization needed

## Sidebar Navigation
- Dashboard (home/overview)
- Leads (enquiry pipeline)
- Students (all enrolled students)
- Fees (payment tracking)
- Araiki (attunement tracker)
- Meetups (bi-weekly attendance)
- Settings

## Authentication
- Same Supabase auth as NYG Connect
- Only users with role = 'admin' in profiles table can access
- Non-admins get redirected to a "Access Denied" page
- Use supabase.rpc('is_admin') to verify server-side

## Supabase Tables (shared with NYG Connect)
- profiles — id, full_name, role, avatar_url
- students — profile_id, name, phone, email, xp, level_number, streak
- practice_logs — student_id, practice_type, duration_minutes, xp_earned, created_at
- enquiries — id, name, phone, email, location, source, course_interested, status, follow_up_date, notes, created_at

## New CRM Tables
- enrollments — id, student_profile_id, course, status, start_date, fee_type, total_fee_agreed, notes
- installments — id, enrollment_id, amount, due_date, paid_date, payment_method, status, receipt_notes
- araiki_attunements — id, student_profile_id, attunement_number (1-6), date_attended, practice_start_date, ready_for_next, admin_notes
- meetups — id, title, date, type, notes
- meetup_attendance — id, meetup_id, student_profile_id, attended
- lead_notes — id, enquiry_id, admin_id, note, follow_up_type, created_at
- student_notes — id, student_profile_id, admin_id, note, created_at
- intake_forms — unified student intake/assessment form linked to profiles.id

## Shared Tables (from NYG Connect, readable by CRM)
- notifications, parchments, practice_logs, students, profiles — all in same Supabase project, CRM reads these directly

## Course Types
- Regular Yoga (monthly: Rs 1,500 existing / Rs 2,000 after first month / Rs 2,500 first month with registration / Rs 1,000 kids)
- Araiki Local (donation — variable)
- Araiki Foreigner (one-time Rs 20,000)
- Amasana / Inner Mastery Circle (monthly Rs 499 or annual Rs 5,000)
- TTC (flexible — scholarship/partial/full, installments possible)
- Free Workshop (Rs 0)

## Enquiry Pipeline Stages
New → Contacted → Interested → Enrolled → Lost

## Key Business Rules
- When lead status changes to Enrolled → automatically create student enrollment record
- Araiki has 6 attunements — student must practice 21 days between each
- Students can be enrolled in multiple courses simultaneously
- Amasana annual payment (Rs 5,000) auto-marks 12 months as paid
- TTC fees are fully flexible per student

## Student Profile Page (src/pages/StudentProfile.jsx)
Six-tab student profile accessible by clicking any student in the Students list:
- Intake Form — full health/lifestyle/NYG assessment form (IntakeFormTab.jsx)
- Progress — parameters over time, before/after comparison (coming soon)
- Practice Activity — live practice logs from NYG Connect (PracticeActivityTab.jsx)
- Fees — enrollments and installments with ₹ tracking (FeesTab.jsx)
- Araiki — attunement progress and challenge status (coming soon)
- Notes — admin notes log with timestamps (NotesTab.jsx)

## Debugging Protocol

### Deployment Issues (Vercel + React)
When a feature is built but not showing on production:
1. Confirm code is correct locally
2. Run npm run build — confirm zero errors
3. Confirm git push was successful
4. Check Vercel Deployments — is the latest commit SHA showing as Ready?
5. If code is correct + build clean + still not working → pipeline problem, NOT code
6. Fix: Vercel → Settings → Git → Disconnect → Reconnect GitHub
7. Never spend more than 10 minutes debugging confirmed-correct code

### Supabase RLS Issues
If data is not loading after correct code is confirmed:
- Check Network tab for 4xx errors on Supabase requests
- Check RLS policies on the relevant table
- Test with service role key to confirm it's an RLS issue

## Do NOT
- Build mobile layouts — laptop only
- Use any paid external services
- Touch NYG Connect PWA code
- Over-engineer — keep it clean and functional
