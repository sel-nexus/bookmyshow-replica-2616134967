import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cleanup } from '@testing-library/react';
import { AuthForm } from '../components/auth/AuthForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../components/auth/AuthProvider', () => ({ useAuth: () => ({ setSession: vi.fn() }) }));

afterEach(() => cleanup());

describe('AuthForm', () => {
  it('shows the mobile field and submits a valid login request', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'OTP ready', user: { id: 1, mobileNumber: '9876543210' } }), { status: 200 }));
    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText('Mobile number'), '9876543210');
    await user.click(screen.getByRole('button', { name: 'Continue to OTP' }));
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({ method: 'POST' }));
    fetchMock.mockRestore();
  });

  it('shows an accessible error and avoids a request for an invalid mobile number', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(global, 'fetch');
    render(<AuthForm mode="login" />);
    await user.type(screen.getByLabelText('Mobile number'), '123');
    await user.click(screen.getByRole('button', { name: 'Continue to OTP' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid 10-digit mobile number');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('shows OTP validation when the verification code is incomplete', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(global, 'fetch');
    render(<AuthForm mode="verify" initialMobileNumber="9876543210" />);
    await user.type(screen.getByLabelText('One-time password'), '12');
    await user.click(screen.getByRole('button', { name: 'Verify & enter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('4-digit OTP');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
