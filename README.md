# BookMyShow Replica

A focused full-stack cinema booking replica. The seeded demo journey is mobile login with OTP `1234`, movie discovery, theatre selection, deterministic seats `A1`, `A2`, `A3` at Rs. 450, dummy Card/UPI payment, and a persisted booking confirmation.

## Stack

- Frontend: Next.js 15 App Router, React, TypeScript, Tailwind CSS
- Backend: Node.js 22, Express, TypeScript
- Persistence: file-backed SQLite via Node's built-in `node:sqlite`
- Tests: Vitest, Testing Library, Supertest, Playwright

## Development

Install dependencies independently:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Run the backend and frontend in separate terminals:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

The frontend runs at `http://localhost:3000`; the backend health endpoint is `http://localhost:4000/api/health`. SQLite is seeded on backend startup. Environment contracts and runnable local defaults are in `backend/.env.example`, `backend/.env`, `frontend/.env.example`, and `frontend/.env.local` (local env files are ignored).

## API

Business routes use `/api/v1`:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify`
- `GET /api/v1/auth/session`
- `GET /api/v1/movies`
- `GET /api/v1/theatres?movieId=<id>`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/:confirmationId`
- `GET /api/health`

Protected routes require the bearer token returned by OTP verification.

## Verification

```bash
cd backend && npm run build
cd backend && npm test -- --run
cd frontend && npm run typecheck
cd frontend && npm test
cd backend && npm test -- --run tests/integration.test.ts
cd frontend && npm run build
cd frontend && npm run test:e2e
```

The Playwright configuration starts both services, runs desktop and Pixel 5 mobile projects, captures browser errors, asserts live API responses, and saves representative screenshots.

## Compose

Build and start both production services:

```bash
docker compose up --build -d
docker compose down --remove-orphans
```

The backend uses a named `booking-data` volume for SQLite persistence. The frontend reaches the backend through the Compose service name `backend`; the backend health check gates frontend startup.

## Scope

This is a deterministic demonstration, not a production marketplace. Real SMS delivery, payment authorization, live inventory/seat locking, showtimes, refunds, administration, booking history, and production authentication hardening are out of scope.
