-- Update wallet_transactions reference_type constraint to allow 'subscription'

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_reference_type_check;

ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_reference_type_check check (reference_type in ('recharge', 'consultation', 'refund', 'bonus', 'subscription'));
