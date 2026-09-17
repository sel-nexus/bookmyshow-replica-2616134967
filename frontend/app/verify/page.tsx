'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthForm } from '../../components/auth/AuthForm';
import { readMobileNumber } from '../../lib/auth';

/** Renders the OTP verification page for the mobile number just submitted. */
export default function VerifyPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  useEffect(() => setMobileNumber(readMobileNumber()), []);
  return (
    <main className="auth-page">
      <section className="auth-aside" aria-labelledby="verify-aside-heading">
        <Link className="brand" href="/"><span className="brand-mark">B</span><span>bookmyshow replica</span></Link>
        <div><h1 id="verify-aside-heading">One small step. Then curtain up.</h1><p>Your secure access code keeps the journey simple and personal.</p></div>
      </section>
      <section className="auth-content" aria-labelledby="verify-heading">
        <div className="auth-card">
          <span className="eyebrow">Final check</span>
          <h2 id="verify-heading">Enter your OTP.</h2>
          <p>Use the four-digit code sent to {mobileNumber || 'your mobile number'}.</p>
          {mobileNumber ? (
            <AuthForm mode="verify" initialMobileNumber={mobileNumber} />
          ) : (
            <p role="status">Loading your verification details...</p>
          )}
          <Link className="back-link" href="/login">← Change mobile number</Link>
        </div>
      </section>
    </main>
  );
}
