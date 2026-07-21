import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import KundliProfileSelector from '../components/KundliProfileSelector';
import type { KundliProfile } from '../../../types/kundli';

const ASTROLOGER_ID = 'astrologer-test-001';

const mockProfile = (overrides: Partial<KundliProfile> = {}): KundliProfile => ({
  id: 'profile-aaa',
  ownerId: 'user-1',
  name: 'Shreshth',
  relation: 'self',
  birthDetails: { dateOfBirth: '1995-06-15', timeOfBirth: '10:30', placeOfBirth: 'Delhi' } as any,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  isDefault: true,
  ...overrides,
});

/** Default no-op stubs for required new props. */
const noopEnsure = vi.fn().mockResolvedValue(null);

describe('KundliProfileSelector', () => {
  const onConfirm = vi.fn();
  const onCancel  = vi.fn();
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Zero profiles, ensureSelfProfile returns null ─────────────────────────

  it('shows "No Kundli Profile Found" when both loadProfiles and ensureSelfProfile return empty/null', async () => {
    const loadProfiles = vi.fn().mockResolvedValue([]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No Kundli Profile Found/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Create Kundli Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start Consultation/i })).not.toBeInTheDocument();
  });

  it('navigates to kundli-profile-form (NOT nova-kundli) with consultation context when "Create Kundli Profile" is clicked', async () => {
    const loadProfiles = vi.fn().mockResolvedValue([]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText(/No Kundli Profile Found/i));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create Kundli Profile/i }));
    });

    // Must navigate to kundli-profile-form, never to nova-kundli
    expect(onNavigate).toHaveBeenCalledWith('kundli-profile-form', {
      fromScreen:  'consultation-chat',
      astrologerId: ASTROLOGER_ID,
      returnTo:    'consultation-chat',
      intent:      'select-kundli-for-consultation',
    });
    expect(onNavigate).not.toHaveBeenCalledWith('nova-kundli', expect.anything());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  // ── Auto-sync: ensureSelfProfile creates profile ──────────────────────────

  it('calls ensureSelfProfile when loadProfiles returns empty list', async () => {
    const synced  = mockProfile({ id: 'synced-self-001', name: 'Auto Synced' });
    const loadProfiles = vi.fn()
      .mockResolvedValueOnce([])        // first call: empty
      .mockResolvedValueOnce([synced]); // second call (after sync): one profile
    const ensureSelfProfile = vi.fn().mockResolvedValue(synced);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={ensureSelfProfile}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText('Auto Synced'));

    expect(ensureSelfProfile).toHaveBeenCalledTimes(1);
    // Profile selector should show — not the empty state
    expect(screen.queryByText(/No Kundli Profile Found/i)).not.toBeInTheDocument();
  });

  it('does NOT call ensureSelfProfile when loadProfiles already returns profiles', async () => {
    const profile = mockProfile();
    const loadProfiles = vi.fn().mockResolvedValue([profile]);
    const ensureSelfProfile = vi.fn().mockResolvedValue(null);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={ensureSelfProfile}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText(profile.name));

    expect(ensureSelfProfile).not.toHaveBeenCalled();
  });

  it('shows "Create Kundli Profile" when ensureSelfProfile returns null (incomplete birth details)', async () => {
    const loadProfiles = vi.fn().mockResolvedValue([]);
    const ensureSelfProfile = vi.fn().mockResolvedValue(null); // birth details incomplete

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={ensureSelfProfile}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText(/No Kundli Profile Found/i));

    expect(screen.getByRole('button', { name: /Create Kundli Profile/i })).toBeInTheDocument();
    expect(ensureSelfProfile).toHaveBeenCalledTimes(1);
  });

  // ── Exactly one profile ────────────────────────────────────────────────────

  it('preselects the single profile but still requires explicit confirmation', async () => {
    const profile = mockProfile();
    const loadProfiles = vi.fn().mockResolvedValue([profile]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText(profile.name));

    const confirmBtn = screen.getByRole('button', { name: /Start Consultation/i });
    expect(confirmBtn).toBeEnabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with the correct profile ID when customer taps Start Consultation (1 profile)', async () => {
    const profile = mockProfile({ id: 'profile-single-001' });
    const loadProfiles = vi.fn().mockResolvedValue([profile]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText(profile.name));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Start Consultation/i }));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('profile-single-001');
  });

  // ── Multiple profiles ──────────────────────────────────────────────────────

  it('shows all profiles without preselecting any when there are multiple', async () => {
    const profileA = mockProfile({ id: 'p-aaa', name: 'Shreshth' });
    const profileB = mockProfile({ id: 'p-bbb', name: 'Priya', relation: 'partner' });
    const loadProfiles = vi.fn().mockResolvedValue([profileA, profileB]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Shreshth')).toBeInTheDocument();
      expect(screen.getByText('Priya')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Start Consultation/i })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('enables confirm only after explicit selection and passes the correct ID', async () => {
    const profileA = mockProfile({ id: 'p-aaa', name: 'Shreshth' });
    const profileB = mockProfile({ id: 'p-bbb', name: 'Priya', relation: 'partner' });
    const loadProfiles = vi.fn().mockResolvedValue([profileA, profileB]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={false}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText('Priya'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Priya/i }));
    });

    const confirmBtn = screen.getByRole('button', { name: /Start Consultation/i });
    expect(confirmBtn).toBeEnabled();

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('p-bbb');
  });

  // ── Guard: disabled while submitting ──────────────────────────────────────

  it('keeps confirm button disabled while isSubmitting=true', async () => {
    const profile = mockProfile({ id: 'profile-xyz' });
    const loadProfiles = vi.fn().mockResolvedValue([profile]);

    render(
      <KundliProfileSelector
        loadProfiles={loadProfiles}
        ensureSelfProfile={noopEnsure}
        isSubmitting={true}
        astrologerId={ASTROLOGER_ID}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onNavigate={onNavigate}
      />
    );

    await waitFor(() => screen.getByText(profile.name));

    const confirmBtn = screen.getByRole('button', { name: /Starting/i });
    expect(confirmBtn).toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
