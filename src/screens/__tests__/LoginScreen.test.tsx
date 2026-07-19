import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from '../LoginScreen';

// vi.mock is hoisted — do NOT reference outer variables inside factory
vi.mock('../../services/auth/phoneAuth', () => ({
  normalizeIndianPhone: (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    if (digits.length !== 10) return null;
    if (!/^[6-9]/.test(digits)) return null;
    return `+91${digits}`;
  },
  sendOtp: vi.fn(),
}));

import { sendOtp } from '../../services/auth/phoneAuth';

const mockNavigate = vi.fn();

function renderLogin() {
  return render(<LoginScreen onNavigate={mockNavigate} />);
}

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the phone input', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/enter mobile number/i)).toBeInTheDocument();
  });

  it('shows error for a phone number with fewer than 10 digits', async () => {
    renderLogin();
    const input = screen.getByPlaceholderText(/enter mobile number/i);
    await userEvent.type(input, '99999');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(
      await screen.findByText(/valid 10-digit indian mobile number/i)
    ).toBeInTheDocument();
  });

  it('shows error for a number starting with 0 (invalid prefix)', async () => {
    renderLogin();
    const input = screen.getByPlaceholderText(/enter mobile number/i);
    await userEvent.type(input, '0123456789');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(
      await screen.findByText(/valid 10-digit indian mobile number/i)
    ).toBeInTheDocument();
  });

  it('calls sendOtp with normalized number for a valid 10-digit phone', async () => {
    vi.mocked(sendOtp).mockResolvedValueOnce({ error: null });
    renderLogin();
    const input = screen.getByPlaceholderText(/enter mobile number/i);
    await userEvent.type(input, '9876543210');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => {
      expect(sendOtp).toHaveBeenCalledWith('+919876543210');
    });
  });

  it('navigates to otp screen with phone in params on success', async () => {
    vi.mocked(sendOtp).mockResolvedValueOnce({ error: null });
    renderLogin();
    const input = screen.getByPlaceholderText(/enter mobile number/i);
    await userEvent.type(input, '9876543210');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('otp', { phone: '+919876543210' });
    });
  });

  it('shows API error message on sendOtp failure', async () => {
    vi.mocked(sendOtp).mockResolvedValueOnce({
      error: { code: 'SEND_OTP_FAILED', message: 'Rate limit exceeded' },
    });
    renderLogin();
    const input = screen.getByPlaceholderText(/enter mobile number/i);
    await userEvent.type(input, '9876543210');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
