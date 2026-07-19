import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtpScreen from '../OtpScreen';

// vi.mock is hoisted — use vi.fn() directly inside factory, not outer variables
vi.mock('../../services/auth/phoneAuth', () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

import { sendOtp, verifyOtp } from '../../services/auth/phoneAuth';

const mockNavigate = vi.fn();
const defaultProps = {
  onNavigate: mockNavigate,
  routeParams: { phone: '+919999999999' },
};

function renderOtp(props = defaultProps) {
  return render(<OtpScreen {...props} />);
}

describe('OtpScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders exactly 6 OTP input boxes', () => {
    renderOtp();
    // OTP inputs have type="tel" and inputMode="numeric"; role is "textbox" in jsdom
    const inputs = document.querySelectorAll('input[type="tel"]');
    expect(inputs.length).toBe(6);
  });

  it('displays the formatted phone number', () => {
    renderOtp();
    expect(screen.getByText(/\+91 99999 99999/)).toBeInTheDocument();
  });

  it('auto-advances focus to next box when a digit is typed', async () => {
    renderOtp();
    const inputs = Array.from(document.querySelectorAll('input[type="tel"]')) as HTMLInputElement[];
    inputs[0].focus();
    await userEvent.type(inputs[0], '1');
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('moves focus to previous box on Backspace when current box is empty', async () => {
    renderOtp();
    const inputs = Array.from(document.querySelectorAll('input[type="tel"]')) as HTMLInputElement[];
    // Type into first box (auto-advances to second)
    await userEvent.type(inputs[0], '1');
    // Now inputs[1] is focused; press backspace on the empty box
    fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    expect(document.activeElement).toBe(inputs[0]);
  });

  it('fills all boxes when a 6-digit string is pasted', async () => {
    renderOtp();
    const inputs = Array.from(document.querySelectorAll('input[type="tel"]')) as HTMLInputElement[];

    // jsdom ClipboardEvent constructor doesn't set clipboardData from init options.
    // Attach a custom clipboardData object directly on the event using fireEvent.
    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: (format: string) => (format === 'text' ? '123456' : ''),
      },
    });

    await waitFor(() => {
      expect(inputs[0].value).toBe('1');
      expect(inputs[5].value).toBe('6');
    });
  });

  it('shows an error when Verify is clicked with incomplete OTP', async () => {
    renderOtp();
    const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
    fireEvent.click(verifyBtn);
    expect(await screen.findByText(/please enter all 6 digits/i)).toBeInTheDocument();
  });

  it('calls verifyOtp with phone and token on Verify click', async () => {
    vi.mocked(verifyOtp).mockResolvedValueOnce({ error: null });
    renderOtp();

    const inputs = Array.from(document.querySelectorAll('input[type="tel"]')) as HTMLInputElement[];
    for (let i = 0; i < 6; i++) {
      await userEvent.type(inputs[i], String(i + 1));
    }

    const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith('+919999999999', '123456');
    });
  });

  it('shows an error message on failed OTP verification', async () => {
    vi.mocked(verifyOtp).mockResolvedValueOnce({
      error: { code: 'VERIFY_OTP_FAILED', message: 'Token has expired or is invalid' },
    });
    renderOtp();

    const inputs = Array.from(document.querySelectorAll('input[type="tel"]')) as HTMLInputElement[];
    for (let i = 0; i < 6; i++) {
      await userEvent.type(inputs[i], '0');
    }

    const verifyBtn = screen.getByRole('button', { name: /verify otp/i });
    fireEvent.click(verifyBtn);

    expect(await screen.findByText(/token has expired/i)).toBeInTheDocument();
    // Boxes should be cleared after failure
    await waitFor(() => {
      expect(inputs[0].value).toBe('');
    });
  });

  it('navigates back to login when Change number is clicked', () => {
    renderOtp();
    const changeBtn = screen.getByRole('button', { name: /change number/i });
    fireEvent.click(changeBtn);
    expect(mockNavigate).toHaveBeenCalledWith('login');
  });
});
