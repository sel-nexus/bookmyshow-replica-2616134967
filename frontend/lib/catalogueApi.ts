export interface Movie {
  id: number;
  title: string;
}

export interface Theatre {
  id: number;
  name: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Sends an authenticated request to the catalogue API and normalizes failures. */
async function request<T>(path: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });
  } catch {
    throw new Error('Unable to reach the cinema catalogue. Please try again.');
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'The catalogue could not be loaded.');
  return body as T;
}

/** Loads the movies available to the signed-in user. */
export async function getMovies(token: string): Promise<Movie[]> {
  const result = await request<{ movies: Movie[] }>('/api/v1/movies', token);
  return Array.isArray(result.movies) ? result.movies : [];
}

/** Loads theatres showing the selected movie. */
export async function getTheatres(token: string, movieId: number): Promise<Theatre[]> {
  const result = await request<{ theatres: Theatre[] }>(`/api/v1/theatres?movieId=${encodeURIComponent(movieId)}`, token);
  return Array.isArray(result.theatres) ? result.theatres : [];
}
