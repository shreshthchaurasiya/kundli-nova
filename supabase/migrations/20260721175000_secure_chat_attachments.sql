-- Secure Chat Attachments Storage Policies and Configuration
-- This locks down the chat-attachments bucket natively and ensures tight participant-based read access.

-- Update bucket limits and security properties (ensures size limits and mime types are natively enforced)
UPDATE storage.buckets
SET 
  public = false,
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'chat-attachments';

-- Drop the old overly permissive INSERT policy and the flawed SELECT policy
DROP POLICY IF EXISTS "Chat attachments insert" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments select own" ON storage.objects;

-- We DO NOT create an INSERT policy. All uploads occur via Server-issued Signed Upload URLs (which bypass RLS via service_role).
-- We DO NOT create an UPDATE/DELETE policy for users. Deletions (orphan cleanup) occur via service_role.

-- Secure SELECT: Sender and Recipient can both read images for their session
CREATE POLICY "Chat attachments select participants" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'chat-attachments' 
  AND (string_to_array(name, '/'))[1] = 'consultations'
  AND exists (
    select 1 from public.consultation_sessions as session
    where session.id::text = (string_to_array(name, '/'))[2]
      and (
        session.user_id = auth.uid()
        or exists (
          select 1 from public.astrologers a 
          where a.id = session.astrologer_id and a.user_id = auth.uid()
        )
      )
  )
);
