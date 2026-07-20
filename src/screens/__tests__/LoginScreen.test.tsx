import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginScreen from '../LoginScreen';

vi.mock('../../services/auth/emailAuth', () => ({
  signInWithEmail: vi.fn(),
}));

vi.mock('../../services/auth/oauthAuth', () => ({
  signInWithOAuth: vi.fn(),
}));

import { signInWithEmail } from '../../services/auth/emailAuth';
import { signInWithOAuth } from '../../services/auth/oauthAuth';

const mockNavigate = vi.fn();

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the current email and password login fields', () => {
    render(<LoginScreen onNavigate={mockNavigate} />);

    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/^password$/i)).toBeInTheDocument();
  });

  it('keeps Continue disabled until both fields have values', async () => {
    render(<LoginScreen onNavigate={mockNavigate} />);
    const continueButton = screen.getByRole('button', { name: /^continue$/i });

    expect(continueButton).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/email address/i), 'user@example.com');
    expect(continueButton).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secure-password');
    expect(continueButton).toBeEnabled();
  });

  it('signs in with the submitted email and password', async () => {
    vi.mocked(signInWithEmail).mockResolvedValueOnce({ error: null });
    render(<LoginScreen onNavigate={mockNavigate} />);

    await userEvent.type(screen.getByPlaceholderText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'secure-password');
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith('user@example.com', 'secure-password');
    });
  });

  it('shows the Supabase login error', async () => {
    vi.mocked(signInWithEmail).mockResolvedValueOnce({
      error: { code: 'LOGIN_FAILED', message: 'Invalid login credentials' },
    });
    render(<LoginScreen onNavigate={mockNavigate} />);

    await userEvent.type(screen.getByPlaceholderText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByPlaceholderText(/^password$/i), 'wrong-password');
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByText(/invalid login credentials/i)).toBeInTheDocument();
  });

  it('starts Google OAuth from the existing Google button', () => {
    render(<LoginScreen onNavigate={mockNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(signInWithOAuth).toHaveBeenCalledWith('google');
  });

  it('opens the forgot-password flow', () => {
    render(<LoginScreen onNavigate={mockNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(mockNavigate).toHaveBeenCalledWith('forgot-password');
  });
});
