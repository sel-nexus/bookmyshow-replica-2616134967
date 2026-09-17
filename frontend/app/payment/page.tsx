'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { PaymentForm } from '../../components/booking/PaymentForm';
import { createBooking, type Booking, type PaymentMethod } from '../../lib/bookingApi';

function PaymentContent() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const movieId = Number(searchParams.get('movieId'));
  const theatreId = Number(searchParams.get('theatreId'));
  const seats = (searchParams.get('seats') ?? '').split(',').filter(Boolean);
  const totalPrice = Number(searchParams.get('totalPrice'));
  const [error, setError] = useState('');
  const validContext = Number.isInteger(movieId) && movieId > 0 && Number.isInteger(theatreId) && theatreId > 0 && seats.length > 0 && totalPrice > 0;

  useEffect(() => {
    if (!isAuthLoading && !user) {
      window.location.assign('/login');
    }
  }, [isAuthLoading, user]);

  async function submitPayment(paymentMethod: PaymentMethod): Promise<Booking> {
    if (!token) {
      throw new Error('Your session has expired. Please sign in again.');
    }
    const booking = await createBooking(token, {
      movieId,
      theatreId,
      seats,
      paymentMethod,
      totalPrice,
    });
    sessionStorage.setItem('bookmyshow:lastBooking', JSON.stringify(booking));
    router.push(`/confirmation?confirmationId=${encodeURIComponent(booking.confirmationId)}&movieId=${movieId}&theatreId=${theatreId}`);
    return booking;
  }

  if (isAuthLoading || !user) {
    return (
      <main className="welcome">
        <p role="status">Loading your session...</p>
      </main>
    );
  }

  if (!validContext) {
    return (
      <main className="welcome">
        <p className="form-error" role="alert">
          Your seat selection is incomplete. Please start again.
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
        <span className="header-note">Step 2 of 2</span>
      </header>
      <section className="welcome" aria-labelledby="payment-heading">
        <span className="eyebrow">Almost there</span>
        <h1 id="payment-heading">Make it official.</h1>
        <p>
          {seats.join(', ')} · Rs. {totalPrice}
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="focal-panel" style={{ marginTop: 34 }}>
          <PaymentForm onSubmit={submitPayment} />
        </div>
      </section>
    </main>
  );
}

/** Provides URL search-param suspense for the payment route. */
export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <main className="welcome">
          <p role="status">Loading payment...</p>
        </main>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
