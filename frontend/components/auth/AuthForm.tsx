'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, verify } from '../../lib/apiClient';
import { saveMobileNumber } from '../../lib/auth';
import { useAuth } from './AuthProvider';

type AuthMode = 'login' | 'verify';

interface AuthFormProps {
  mode: AuthMode;
  initialMobileNumber?: string;
}

/** Renders the mobile login or fixed-OTP verification form with visible states. */
export function AuthForm({ mode, initialMobileNumber = '' }: AuthFormProps) {
  const router = useRouter();
  const { setSession } = useAuth();
  const [mobileNumber, setMobileNumber] = useState(initialMobileNumber);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (mode === 'verify' && !/^\d{4}$/.test(otp)) {
      setError('Enter the 4-digit OTP.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(mobileNumber);
        saveMobileNumber(mobileNumber);
        router.push('/verify');
      } else {
        const result = await verify(mobileNumber, otp);
        setSession(result.token, result.user);
        router.push('/');
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === 'login';
  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="mobileNumber">Mobile number</label>
        <input
          id="mobileNumber"
          name="mobileNumber"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={mobileNumber}
          onChange={(event) => setMobileNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
          aria-required="true"
          aria-invalid={Boolean(error && (!mobileNumber || !/^\d{10}$/.test(mobileNumber)))}
          placeholder="9876543210"
        />
      </div>
      {!isLogin && (
        <div className="field-group">
          <label htmlFor="otp">One-time password</label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
            aria-required="true"
            aria-invalid={Boolean(error && !/^\d{4}$/.test(otp))}
            aria-describedby="otp-hint"
            placeholder="1234"
          />
          <p id="otp-hint" className="field-hint">Demo OTP: 1234</p>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Please wait…' : isLogin ? 'Continue to OTP' : 'Verify & enter'}
      </button>
    </form>
  );
}
