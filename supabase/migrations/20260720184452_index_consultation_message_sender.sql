create index if not exists idx_consultation_messages_sender_user
  on public.consultation_messages(sender_user_id);
