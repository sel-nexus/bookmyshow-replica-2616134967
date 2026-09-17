'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookingSummary } from '../../components/booking/BookingSummary';
import { useAuth } from '../../components/auth/AuthProvider';
import { getBooking, type Booking } from '../../lib/bookingApi';

function ConfirmationContent() {
  const { token, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    let storedBooking: Booking | null = null;
    try {
      const storedPayload = sessionStorage.getItem('bookmyshow:lastBooking');
      if (storedPayload) {
        storedBooking = JSON.parse(storedPayload) as Booking;
      }
    } catch {
      storedBooking = null;
    }

    const confirmationId = searchParams.get('confirmationId') ?? storedBooking?.confirmationId ?? '';
    if (storedBooking) {
      setBooking(storedBooking);
    }
    if (!token || !confirmationId) {
      setError(!token ? 'Your session has expired. Please sign in again.' : 'We could not find a completed booking. Please start checkout again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getBooking(token, confirmationId)
      .then((persistedBooking) => {
        setBooking(persistedBooking);
        setError('');
      })
      .catch((requestError: unknown) => {
        setBooking(null);
        setError(requestError instanceof Error ? requestError.message : 'The confirmation could not be loaded.');
      })
      .finally(() => setIsLoading(false));
  }, [isAuthLoading, searchParams, token]);

  if (isAuthLoading || isLoading) {
    return (
      <main className="welcome">
        <p role="status">Loading your confirmation...</p>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="welcome">
        <p className="form-error" role="alert">
          {error || 'We could not find a completed booking. Please start checkout again.'}
        </p>
        <Link className="back-link" href="/dashboard">
          ← Back to movies
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">B</span>
          <span>bookmyshow replica</span>
        </Link>
        <span className="header-note">Booking confirmed</span>
      </header>
      <section className="welcome" aria-labelledby="confirmation-heading">
        <span className="eyebrow">Your night is booked</span>
        <h1 id="confirmation-heading">Congratulations!</h1>
        <p>Your big-screen plan is ready. Keep this confirmation ID for your records.</p>
        <div className="focal-panel" style={{ marginTop: 34 }}>
          <BookingSummary booking={booking} />
        </div>
        <Link className="back-link" href="/dashboard">
          ← Browse more movies
        </Link>
      </section>
    </main>
  );
}

/** Provides search-param suspense while loading the authenticated confirmation. */
export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="welcome">
          <p role="status">Loading your confirmation...</p>
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
