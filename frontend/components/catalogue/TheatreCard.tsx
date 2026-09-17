import React from 'react';
import type { Theatre } from '../../lib/catalogueApi';

interface TheatreCardProps {
  theatre: Theatre;
}

/** Presents a theatre name in the catalogue's selection list. */
export function TheatreCard({ theatre }: TheatreCardProps) {
  return (
    <article className="focal-panel" aria-label={theatre.name}>
      <span className="panel-kicker">Cinema {String(theatre.id).padStart(2, '0')}</span>
      <h2>{theatre.name}</h2>
      <p className="hero-copy">A place to settle in for the story.</p>
    </article>
  );
}
