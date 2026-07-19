-- Secure Storage Buckets Migration
-- Transition profile-photos, chat-attachments, compiled-reports to private buckets

UPDATE storage.buckets
SET public = false
WHERE id IN ('profile-photos', 'chat-attachments', 'compiled-reports');

-- Drop old generic SELECT policies that didn't check ownership
DROP POLICY IF EXISTS "Profile photos select" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments select" ON storage.objects;
DROP POLICY IF EXISTS "Compiled reports select" ON storage.objects;

-- Create Ownership-aware Select Policies (Clients can read their own uploads)
CREATE POLICY "Profile photos select own" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-photos' AND auth.uid() = owner
);

CREATE POLICY "Chat attachments select own" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-attachments' AND auth.uid() = owner
);

-- Note: Other users in a chat session or viewing a profile will access files via 
-- backend-generated Short-Lived Signed URLs (using service_role which bypasses RLS)

CREATE POLICY "Compiled reports select own" ON storage.objects
FOR SELECT USING (
  bucket_id = 'compiled-reports' AND auth.uid() = owner
);

-- Service role has full access inherently via Postgres superuser/bypassrls, 
-- but explicitly allowing service_role on storage objects is good practice if needed.
CREATE POLICY "Service role full access storage" ON storage.objects
FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
