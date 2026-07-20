-- Filename version matches the applied remote migration history.
-- The service_role bypasses RLS. Keeping a permissive service-role policy on
-- the public role makes Postgres evaluate it for every customer request and
-- creates overlapping SELECT/UPDATE policies.
drop policy if exists "Admin modify astrologers" on public.astrologers;
