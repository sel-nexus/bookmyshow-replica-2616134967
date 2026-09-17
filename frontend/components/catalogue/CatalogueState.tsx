'use client';

import React from 'react';

interface CatalogueStateProps {
  status: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
}

/** Renders an accessible loading, error, or empty catalogue state. */
export function CatalogueState({ status, message, onRetry }: CatalogueStateProps) {
  if (status === 'loading') {
    return <p className="form-error" role="status" aria-live="polite">Loading the cinema catalogue…</p>;
  }
  if (status === 'error') {
    return <div className="form-error" role="alert"><p>{message ?? 'The catalogue could not be loaded.'}</p>{onRetry && <button className="primary-button" type="button" onClick={onRetry}>Try again</button>}</div>;
  }
  return <div className="focal-panel" role="status"><span className="panel-kicker">No screenings found</span><h2>Nothing is showing here yet.</h2><p className="hero-copy">Try another movie or check back when the next showtimes are released.</p></div>;
}
