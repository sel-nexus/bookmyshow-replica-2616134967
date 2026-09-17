'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookingSummary } from '../../components/booking/BookingSummary';
import type { Booking } from '../../lib/bookingApi';

/** Renders the backend-returned booking confirmation after checkout. */
export default function ConfirmationPage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedBooking = sessionStorage.getItem('bookmyshow:lastBooking');
      if (storedBooking) setBooking(JSON.parse(storedBooking) as Booking);
    } catch {
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) return <main className="welcome"><p role="status">Loading your confirmation...</p></main>;
  if (!booking) return <main className="welcome"><p className="form-error" role="alert">We could not find a completed booking. Please start checkout again.</p><Link className="back-link" href="/dashboard">← Back to movies</Link></main>;

  return (
    <main className="page-shell">
      <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">B</span><span>bookmyshow replica</span></Link><span className="header-note">Booking confirmed</span></header>
      <section className="welcome" aria-labelledby="confirmation-heading">
        <span className="eyebrow">Your night is booked</span>
        <h1 id="confirmation-heading">Congratulations!</h1>
        <p>Your big-screen plan is ready. Keep this confirmation ID for your records.</p>
        <div className="focal-panel" style={{ marginTop: 34 }}><BookingSummary booking={booking} /></div>
        <Link className="back-link" href="/dashboard">← Browse more movies</Link>
      </section>
    </main>
  );
}
