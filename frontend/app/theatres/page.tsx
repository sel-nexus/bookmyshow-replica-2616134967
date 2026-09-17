'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CatalogueState } from '../../components/catalogue/CatalogueState';
import { TheatreCard } from '../../components/catalogue/TheatreCard';
import { useAuth } from '../../components/auth/AuthProvider';
import { getTheatres, type Theatre } from '../../lib/catalogueApi';

/** Renders theatres mapped to the movie selected in the URL. */
function TheatresContent() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();
  const movieId = Number(searchParams.get('movieId'));
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [error, setError] = useState('');

  async function loadTheatres(): Promise<void> {
    if (!token || !Number.isInteger(movieId) || movieId <= 0) {
      setStatus('empty');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const result = await getTheatres(token, movieId);
      setTheatres(result);
      setStatus(result.length ? 'ready' : 'empty');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The theatres could not be loaded.');
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!isAuthLoading && !user) window.location.assign('/login');
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isAuthLoading && token) void loadTheatres();
  }, [isAuthLoading, token, movieId]);

  if (isAuthLoading || !user || !token) return <main className="welcome"><CatalogueState status="loading" />;</main>;

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">B</span><span>bookmyshow replica</span></Link>
        <Link className="text-link" href="/dashboard">← All movies</Link>
      </header>
      <section className="welcome" aria-labelledby="theatres-heading">
        <span className="eyebrow">Your next stop</span>
        <h1 id="theatres-heading">Pick a theatre.</h1>
        <p>The best stories deserve a room built for them.</p>
        {status === 'loading' && <CatalogueState status="loading" />}
        {status === 'error' && <CatalogueState status="error" message={error} onRetry={() => void loadTheatres()} />}
        {status === 'empty' && <CatalogueState status="empty" />}
        {status === 'ready' && <div className="panel-list">{theatres.map((theatre) => <TheatreCard key={theatre.id} theatre={theatre} />)}</div>}
      </section>
    </main>
  );
}

/** Provides the required Suspense boundary for URL-driven theatre selection. */
export default function TheatresPage() {
  return (
    <Suspense fallback={<main className="welcome"><CatalogueState status="loading" /></main>}>
      <TheatresContent />
    </Suspense>
  );
}
