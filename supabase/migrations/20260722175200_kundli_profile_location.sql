-- Add location fields for real Kundli calculation.
-- Allow nulls because existing profiles will be missing this data until they are repaired/updated.
ALTER TABLE kundli_profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS timezone text;
