# Ninja Payments Dashboard

React + TypeScript dashboard to explore payments, PSP performance, disputes, refunds, and service health in near-real time. The project boots with MSW-powered mocks so product owners can navigate the UI while backend APIs are being finalized.

## Features
- Overview with KPIs, time-series chart, and PSP leaderboard.
- Virtualized transactions table with pagination, filters by date, company, PSP, and status.
- Email/password sign-in flow that issues the bearer token required by the Executive API; all routes enforce the session.
- Live service health view fed by a mock WebSocket stream with exponential backoff.
- Dark/light theme, responsive layout, accessibility-first components (Tailwind + shadcn-inspired primitives).
- Global store via Zustand with slices for filters, metrics, and stream events.
- MSW mock server covering `/metrics`, `/payments`, `/companies`, `/disputes`, `/refunds`, and `/service-health` plus synthetic WebSocket events.
- Vitest + Testing Library unit tests and Playwright smoke spec scaffold.
- ESLint + Prettier configured for the stack, optional feature flags through `VITE_FEATURE_FLAGS`.

## Quick Start
```bash
npm install
npm run dev
```
The dev server starts at `http://localhost:5173`. A service worker mock boots automatically (configured via `VITE_ENABLE_MSW=true`).
Sign in with `carlos@ninja.cl` / `miClaveSuperSecreta` (seeded user in `schema.sql`).

## Available Scripts
- `npm run dev` – start Vite dev server with MSW mocks.
- `npm run build` – type-check and build production bundle.
- `npm run preview` – preview the production build.
- `npm run lint` – ESLint flat config.
- `npm run format` / `npm run format:check` – Prettier.
- `npm run typecheck` – TypeScript `--noEmit`.
- `npm run test` – Vitest unit tests (MSW server auto-starts).
- `npm run test:watch` – Vitest in watch mode.
- `npm run playwright:test` – Playwright E2E (reminder: `npx playwright install` first).
- `npm run ci` – lint + typecheck + unit tests.

## Environment Variables
Copy `.env.example` to `.env` as needed:
```
VITE_API_BASE_URL=http://127.0.0.1:8200/api/v1
VITE_API_TOKEN=supersecret
VITE_ENABLE_MSW=false
VITE_FEATURE_FLAGS=export-csv
VITE_EXECUTIVE_HEALTH_URL=http://127.0.0.1:8200/api/v1/health/metrics
VITE_EXECUTIVE_HEALTH_TOKEN=supersecret
VITE_EXECUTIVE_SERVICE_NAME=Executive API
VITE_PAYMENTS_HEALTH_URL=http://127.0.0.1:8300/health/metrics
VITE_PAYMENTS_HEALTH_TOKEN=
VITE_PAYMENTS_SERVICE_NAME=Payments API
```
- `VITE_ENABLE_MSW` – set to `true` only when you want to use the MSW fixtures instead of the real API.
- `VITE_API_TOKEN` – optional fallback token reused by health checks and MSW login responses; real sessions fetch the bearer token via `/auth/login`.
- `VITE_FEATURE_FLAGS` – comma-separated list for simple boolean feature toggles (e.g. `export-csv`).
- `VITE_EXECUTIVE_HEALTH_*` – connection details for the executive API health endpoint (URL, optional token, display label).
- `VITE_PAYMENTS_HEALTH_*` – connection details for the payments API health endpoint.

## Recommended Folder Structure
```
src/
  app/                # layout + providers
  components/         # feature components and UI primitives
  features/dashboard/ # data hooks, business logic
  hooks/              # shared hooks
  lib/                # utilities, constants, logger, i18n bootstrap
  mocks/              # MSW handlers, fixtures, mock events
  pages/              # routed views (Overview, Transactions, Health)
  services/           # REST and WS clients
  store/              # Zustand slices and types
  test/               # Vitest setup
```

## Data & Mocking
- REST client (`src/services/apiClient.ts`) uses the bearer token stored in the auth store after login; with MSW enabled it falls back to same-origin requests.
- Dashboard events are polled periodically from the API (`/events/latest`) instead of using WebSockets.
- Mock data is generated from `payments` schema cues (`src/mocks/data/fixtures.ts`). Adjust or extend fixtures to reflect new columns or flows.

## Authentication
- The login form calls `POST /api/v1/auth/login` with email + password and stores the returned bearer token in a persisted Zustand slice.
- Seed credentials: `carlos@ninja.cl` / `miClaveSuperSecreta` (password hashed with PBKDF2 in `schema.sql`).
- `useAuthStore` keeps the token in `localStorage`, restores it on refresh, and automatically logs out on HTTP 401 responses.

## Testing
- Unit/integration tests live next to the code (`*.test.tsx`).
- `src/test/setup.ts` wires MSW server + jest-dom matchers.
- Playwright config (`playwright.config.ts`) starts the Vite server automatically; add scenarios under `e2e/` once APIs stabilize.

## Evolution Roadmap
1. **Server-driven pagination** – replace client pagination with backend cursors, reuse Zustand store for metadata.
2. **XLSX exports** – integrate `sheetjs` or backend-generated links alongside the CSV exporter.
3. **Saved views & roles** – persist filter presets per `filters.role`, surface RBAC-aware sections.
4. **Heatmap / Geo view** – behind a feature flag, consume geo info from payments/disputes.
5. **Telemetry pipeline** – stream `logInfo`/`logError` events to a logging service (Datadog, OpenTelemetry) and surface user feedback.

## Notes
- Keep secrets out of the repo; rely on `.env` for tokens.
- Tailwind utilities rely on CSS variables defined in `src/index.css` and the theme provider toggles the `dark` class on `<html>`.
- When wiring to real APIs, disable MSW (`VITE_ENABLE_MSW=false`) and update base URLs plus CORS settings accordingly.
