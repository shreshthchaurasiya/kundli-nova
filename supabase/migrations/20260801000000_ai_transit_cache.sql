-- Migration for AI transit/gochar caching
-- This prevents the AI from hammering the Astrology API multiple times a day for the same user.

CREATE TABLE IF NOT EXISTS public.daily_transit_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.kundli_profiles(id) ON DELETE CASCADE,
    transit_date DATE NOT NULL,
    transit_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint so we only have one cache entry per profile per day
CREATE UNIQUE INDEX IF NOT EXISTS unique_transit_cache_per_day ON public.daily_transit_cache(profile_id, transit_date);

-- RLS
ALTER TABLE public.daily_transit_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transit cache"
    ON public.daily_transit_cache FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.kundli_profiles
            WHERE id = daily_transit_cache.profile_id
            AND owner_id = auth.uid()
        )
    );

-- Allow service role full access
CREATE POLICY "Service role full access on transit_cache"
    ON public.daily_transit_cache FOR ALL
    USING (true)
    WITH CHECK (true);
