create table if not exists public.astrologer_reviews (
  id uuid default gen_random_uuid() primary key,
  astrologer_id uuid references public.astrologers(id) on delete cascade not null,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  consultation_id uuid references public.consultation_sessions(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.astrologer_reviews enable row level security;

-- Policies
create policy "Reviews are viewable by everyone"
  on public.astrologer_reviews for select
  using (true);

create policy "Authenticated users can insert their own reviews"
  on public.astrologer_reviews for insert
  to authenticated
  with check (auth.uid() = customer_id);

-- Trigger to automatically update astrologer rating
create or replace function public.update_astrologer_rating()
returns trigger as $$
begin
  update public.astrologers
  set rating = (
    select coalesce(round(avg(rating)::numeric, 2), 5.00)
    from public.astrologer_reviews
    where astrologer_id = NEW.astrologer_id
  )
  where id = NEW.astrologer_id;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_review_inserted
  after insert or update or delete on public.astrologer_reviews
  for each row execute function public.update_astrologer_rating();
