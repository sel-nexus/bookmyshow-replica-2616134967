import React from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MovieCard } from '../components/catalogue/MovieCard';
import { TheatreCard } from '../components/catalogue/TheatreCard';
import { CatalogueState } from '../components/catalogue/CatalogueState';

vi.mock('next/link', () => ({ default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a> }));

afterEach(() => cleanup());

describe('catalogue components', () => {
  it('renders backend-provided movie and theatre names', () => {
    render(<><MovieCard movie={{ id: 4, title: 'Backend Feature' }} /><TheatreCard theatre={{ id: 8, name: 'Backend Cinema' }} /></>);
    expect(screen.getByRole('link', { name: 'Choose Backend Feature' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backend Cinema' })).toBeInTheDocument();
  });

  it('preserves movieId in the theatre selection link', () => {
    render(<MovieCard movie={{ id: 7, title: 'Linked Movie' }} />);
    expect(screen.getByRole('link', { name: 'Choose Linked Movie' })).toHaveAttribute('href', '/theatres?movieId=7');
  });

  it('renders loading, error, and empty states accessibly', () => {
    const { rerender } = render(<CatalogueState status="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    rerender(<CatalogueState status="error" message="Backend unavailable" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable');
    rerender(<CatalogueState status="empty" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing is showing');
  });
});
