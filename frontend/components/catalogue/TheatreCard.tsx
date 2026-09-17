'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Theatre } from '../../lib/catalogueApi';

interface TheatreCardProps {
  theatre: Theatre;
}

/** Presents a theatre name as a keyboard-accessible seat-selection link. */
export function TheatreCard({ theatre }: TheatreCardProps) {
  const searchParams = useSearchParams();
  const movieId = searchParams?.get('movieId');
  const href = movieId
    ? `/seats?movieId=${encodeURIComponent(movieId)}&theatreId=${theatre.id}`
    : `/seats?theatreId=${theatre.id}`;

  return (
    <Link className="focal-panel" href={href} aria-label={`Choose ${theatre.name}`}>
      <span className="panel-kicker">Cinema {String(theatre.id).padStart(2, '0')}</span>
      <h2>{theatre.name}</h2>
      <p className="hero-copy">A place to settle in for the story.</p>
      <span className="text-link">Choose seats →</span>
    </Link>
  );
}
