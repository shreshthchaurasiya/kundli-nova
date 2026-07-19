// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeIndianPhone } from '../phoneAuth';

// ──────────────────────────────────────────────────────────────────────
// normalizeIndianPhone — pure utility, no Supabase needed
// ──────────────────────────────────────────────────────────────────────

describe('normalizeIndianPhone', () => {
  it('accepts a valid 10-digit number starting with 9', () => {
    expect(normalizeIndianPhone('9999999999')).toBe('+919999999999');
  });

  it('accepts a valid 10-digit number starting with 7', () => {
    expect(normalizeIndianPhone('7000000001')).toBe('+917000000001');
  });

  it('accepts a valid 10-digit number starting with 6', () => {
    expect(normalizeIndianPhone('6111111111')).toBe('+916111111111');
  });

  it('rejects a number with fewer than 10 digits', () => {
    expect(normalizeIndianPhone('99999')).toBeNull();
  });

  it('rejects a number starting with 0 (not a valid mobile prefix)', () => {
    expect(normalizeIndianPhone('0123456789')).toBeNull();
  });

  it('rejects a number starting with 5 (not a valid mobile prefix)', () => {
    expect(normalizeIndianPhone('5123456789')).toBeNull();
  });

  it('strips non-numeric characters before validating', () => {
    expect(normalizeIndianPhone('98765-43210')).toBe('+919876543210');
  });

  it('returns null for an empty string', () => {
    expect(normalizeIndianPhone('')).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// sendOtp and verifyOtp — Supabase client mocked with vi.fn() in factory
// ──────────────────────────────────────────────────────────────────────

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Import AFTER mock is declared
import { sendOtp, verifyOtp } from '../phoneAuth';
import { supabase } from '../../../lib/supabase';

describe('sendOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.signInWithOtp with the given phone', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({ data: { messageId: null, user: null }, error: null } as any);

    const result = await sendOtp('+919999999999');

    expect(result.error).toBeNull();
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ phone: '+919999999999' });
  });

  it('returns an error object when signInWithOtp fails', async () => {
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValueOnce({
      data: { messageId: null, user: null },
      error: { message: 'Rate limit exceeded' } as any,
    } as any);

    const result = await sendOtp('+919999999999');

    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('SEND_OTP_FAILED');
    expect(result.error?.message).toContain('Rate limit exceeded');
  });
});

describe('verifyOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.verifyOtp with phone, token and type=sms', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({ data: { session: null, user: null }, error: null } as any);

    const result = await verifyOtp('+919999999999', '123456');

    expect(result.error).toBeNull();
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      phone: '+919999999999',
      token: '123456',
      type: 'sms',
    });
  });

  it('returns an error for an incorrect OTP', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Token has expired or is invalid' } as any,
    } as any);

    const result = await verifyOtp('+919999999999', '000000');

    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('VERIFY_OTP_FAILED');
  });

  it('enforces that invalid OTP for a non-test phone surfaces the Supabase error', async () => {
    vi.mocked(supabase.auth.verifyOtp).mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Token has expired or is invalid' } as any,
    } as any);

    const result = await verifyOtp('+917777777777', '123456');

    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('VERIFY_OTP_FAILED');
  });
});
