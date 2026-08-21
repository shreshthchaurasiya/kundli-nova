-- Add reviews_count to astrologers table
alter table public.astrologers add column if not exists reviews_count integer default 0 not null;

-- Update the trigger function to also update reviews_count
create or replace function public.update_astrologer_rating()
returns trigger as $$
begin
  update public.astrologers
  set 
    rating = (
      select coalesce(round(avg(rating)::numeric, 2), 5.00)
      from public.astrologer_reviews
      where astrologer_id = NEW.astrologer_id
    ),
    reviews_count = (
      select count(*)
      from public.astrologer_reviews
      where astrologer_id = NEW.astrologer_id
    )
  where id = NEW.astrologer_id;
  return NEW;
end;
$$ language plpgsql security definer;
