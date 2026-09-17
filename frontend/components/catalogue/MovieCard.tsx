import React from 'react';
import Link from 'next/link';
import type { Movie } from '../../lib/catalogueApi';

interface MovieCardProps {
  movie: Movie;
}

/** Presents a movie as a keyboard-accessible selection link. */
export function MovieCard({ movie }: MovieCardProps) {
  return (
    <Link className="focal-panel" href={`/theatres?movieId=${movie.id}`} aria-label={`Choose ${movie.title}`}>
      <span className="panel-kicker">Now showing · {String(movie.id).padStart(2, '0')}</span>
      <h2>{movie.title}</h2>
      <p className="hero-copy">See theatres and find your next screening.</p>
      <span className="text-link">View theatres →</span>
    </Link>
  );
}
