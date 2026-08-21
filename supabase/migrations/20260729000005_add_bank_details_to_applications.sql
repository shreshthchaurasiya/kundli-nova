-- Add bank details to astrologer_applications
alter table public.astrologer_applications
  add column if not exists bank_account_holder_name text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_ifsc_code text;
