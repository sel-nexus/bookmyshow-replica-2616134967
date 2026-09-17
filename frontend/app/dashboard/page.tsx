'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MovieCard } from '../../components/catalogue/MovieCard';
import { CatalogueState } from '../../components/catalogue/CatalogueState';
import { useAuth } from '../../components/auth/AuthProvider';
import { getMovies, type Movie } from '../../lib/catalogueApi';

/** Renders the authenticated movie catalogue dashboard. */
export default function DashboardPage() {
  const { token, user, isLoading: isAuthLoading } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [status, setStatus] = useState<'loading' | 'error' | 'empty' | 'ready'>('loading');
  const [error, setError] = useState('');

  async function loadMovies(): Promise<void> {
    if (!token) return;
    setStatus('loading');
    setError('');
    try {
      const result = await getMovies(token);
      setMovies(result);
      setStatus(result.length ? 'ready' : 'empty');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The movies could not be loaded.');
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!isAuthLoading && !user) window.location.assign('/login');
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!isAuthLoading && token) void loadMovies();
  }, [isAuthLoading, token]);

  if (isAuthLoading || !user || !token) return <main className="welcome"><CatalogueState status="loading" />;</main>;

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" href="/"><span className="brand-mark">B</span><span>bookmyshow replica</span></Link>
        <span className="header-note">Welcome, {user.mobileNumber}</span>
      </header>
      <section className="hero" aria-labelledby="dashboard-heading">
        <div>
          <span className="eyebrow">The evening line-up</span>
          <h1 id="dashboard-heading">Choose your story.</h1>
          <p className="hero-copy">Browse what is playing, then pick a theatre for your night out.</p>
        </div>
        <div className="focal-panel" aria-label="Catalogue introduction"><span className="panel-kicker">BookMyShow Replica</span><h2>Big screen plans, starting with one good choice.</h2></div>
      </section>
      <section className="welcome" aria-labelledby="movies-heading">
        <span className="eyebrow">Now showing</span>
        <h2 id="movies-heading">Movies</h2>
        {status === 'loading' && <CatalogueState status="loading" />}
        {status === 'error' && <CatalogueState status="error" message={error} onRetry={() => void loadMovies()} />}
        {status === 'empty' && <CatalogueState status="empty" />}
        {status === 'ready' && <div className="panel-list">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}</div>}
      </section>
    </main>
  );
}
