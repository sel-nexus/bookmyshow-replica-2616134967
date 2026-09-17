import type { DatabaseSync } from 'node:sqlite';
import type { Movie, Theatre } from '../types/domain';

/** Provides database-backed movie and theatre catalogue queries. */
export class CatalogueService {
  public constructor(private readonly database: InstanceType<typeof DatabaseSync>) {}

  /** Returns the seeded movies in their display order. */
  public listMovies(): Movie[] {
    return this.database.prepare('SELECT id, title FROM movies ORDER BY id').all() as unknown as Movie[];
  }

  /** Returns theatres showing a movie, or an empty list for an unknown movie. */
  public listTheatres(movieId: number): Theatre[] {
    return this.database
      .prepare(`SELECT theatres.id, theatres.name
                FROM theatres
                INNER JOIN movie_theatres ON movie_theatres.theatre_id = theatres.id
                WHERE movie_theatres.movie_id = ?
                ORDER BY theatres.id`)
      .all(movieId) as unknown as Theatre[];
  }
}
