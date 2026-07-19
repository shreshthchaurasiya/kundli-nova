-- Migration: Add email to profiles and optional birth_country
-- Adds email column that was present in frontend but missing from DB

alter table public.profiles
  add column if not exists email text;
