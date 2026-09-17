'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../components/auth/AuthProvider';
import { SeatGrid } from '../../components/booking/SeatGrid';

function SeatsContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const movieId = Number(searchParams.get('movieId'));
  const theatreId = Number(searchParams.get('theatreId'));
  const [seats, setSeats] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const validContext = Number.isInteger(movieId) && movieId > 0 && Number.isInteger(theatreId) && theatreId > 0;

  useEffect(() => {
    if (!isAuthLoading && !user) window.location.assign('/login');
  }, [isAuthLoading, user]);

  if (isAuthLoading || !user) return <main className="welcome"><p role="status">Loading your session...</p></main>;
  if (!validContext) return <main className="welcome"><p className="form-error" role="alert">Choose a movie and theatre before selecting seats.</p><Link className="back-link" href="/dashboard">← Back to movies</Link></main>;

  function continueToPayment(): void {
    const selectedSeats = ['A1', 'A2', 'A3'];
    const params = new URLSearchParams({ movieId: String(movieId), theatreId: String(theatreId), seats: selectedSeats.join(','), totalPrice: '450' });
    router.push(`/payment?${params.toString()}`);
  }

  return (
    <main className="page-shell">
      <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">B</span><span>bookmyshow replica</span></Link><span className="header-note">Step 1 of 2</span></header>
      <section className="welcome" aria-labelledby="seats-heading">
        <span className="eyebrow">Your cinema plan</span>
        <h1 id="seats-heading">Pick your seats.</h1>
        <p>Choose the view you want to remember. Your selection stays in this checkout link.</p>
        <div className="focal-panel" style={{ marginTop: 36 }}><SeatGrid onSelectionChange={(nextSeats, nextTotal) => { setSeats(nextSeats); setTotalPrice(nextTotal); }} /><button className="primary-button" type="button" onClick={continueToPayment} style={{ marginTop: 28 }}>Select Seats</button></div>
      </section>
    </main>
  );
}

/** Provides URL search-param suspense for the seat selection route. */
export default function SeatsPage() {
  return <Suspense fallback={<main className="welcome"><p role="status">Loading seats...</p></main>}><SeatsContent /></Suspense>;
}
