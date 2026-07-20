import { supabase } from '../../../../lib/supabase';
import {
  AstrologerAvailability,
  AstrologerDashboardSession,
  AstrologerDashboardSnapshot,
  AstrologerWorkspaceProfile,
} from '../types';
import { ASTROLOGER_DASHBOARD_SESSION_LIMIT } from '../dashboardConfig';

type WorkspaceProfileRow = {
  id: string;
  user_id: string;
  name: string;
  image: string | null;
  status: AstrologerAvailability;
  price_per_minute: number | string;
  is_published: boolean;
  last_seen: string;
};

type DashboardSessionRow = {
  id: string;
  customer_display_name: string | null;
  status: AstrologerDashboardSession['status'];
  rate_per_minute: number | string;
  requested_at: string;
  started_at: string | null;
  ended_at: string | null;
  billed_minutes: number;
  total_charged: number | string;
};

const workspaceProfileColumns = [
  'id',
  'user_id',
  'name',
  'image',
  'status',
  'price_per_minute',
  'is_published',
  'last_seen',
].join(',');

const dashboardSessionColumns = [
  'id',
  'customer_display_name',
  'status',
  'rate_per_minute',
  'requested_at',
  'started_at',
  'ended_at',
  'billed_minutes',
  'total_charged',
].join(',');

function mapProfile(row: WorkspaceProfileRow): AstrologerWorkspaceProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    image: row.image ?? '',
    availability: row.status,
    pricePerMinute: Number(row.price_per_minute),
    isPublished: row.is_published,
    lastSeenAt: row.last_seen,
  };
}

function mapSession(row: DashboardSessionRow): AstrologerDashboardSession {
  return {
    id: row.id,
    customerDisplayName: row.customer_display_name ?? undefined,
    status: row.status,
    ratePerMinute: Number(row.rate_per_minute),
    requestedAt: row.requested_at,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    billedMinutes: row.billed_minutes,
    totalCharged: Number(row.total_charged),
  };
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Your session has expired. Please sign in again.');
  return data.user.id;
}

export const astrologerDashboardService = {
  async getSnapshot(): Promise<AstrologerDashboardSnapshot | null> {
    const userId = await requireUserId();
    const { data: profileData, error: profileError } = await supabase
      .from('astrologers')
      .select(workspaceProfileColumns)
      .eq('user_id', userId)
      .eq('is_published', true)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profileData) return null;

    const profile = mapProfile(profileData as unknown as WorkspaceProfileRow);
    const { data: sessionData, error: sessionError } = await supabase
      .from('consultation_sessions')
      .select(dashboardSessionColumns)
      .eq('astrologer_id', profile.id)
      .order('requested_at', { ascending: false })
      .limit(ASTROLOGER_DASHBOARD_SESSION_LIMIT);

    if (sessionError) throw new Error(sessionError.message);
    return {
      profile,
      sessions: (sessionData ?? []).map(row => mapSession(row as unknown as DashboardSessionRow)),
    };
  },

  async setAvailability(
    profileId: string,
    availability: Extract<AstrologerAvailability, 'ONLINE' | 'OFFLINE'>,
  ): Promise<AstrologerWorkspaceProfile> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('astrologers')
      .update({ status: availability, last_seen: new Date().toISOString() })
      .eq('id', profileId)
      .eq('user_id', userId)
      .select(workspaceProfileColumns)
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data as unknown as WorkspaceProfileRow);
  },
};
