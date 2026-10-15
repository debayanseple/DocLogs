-- ClinicaLog OMFS — patient intake fields (chief complaint, referral, available reports)
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run (idempotent).

alter table if exists patients
  add column if not exists chief_complaint text,
  add column if not exists referred_by text,
  add column if not exists tests_available text[] not null default '{}';
