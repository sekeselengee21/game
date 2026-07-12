# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Full-stack real-money-style poker game. Java 21 / Quarkus backend (`backend/`, base package `dev.manestack`) and a React 19 + TypeScript + Vite frontend (`p-frontend/`). PostgreSQL + Flyway + jOOQ for persistence, WebSockets for live table updates, JWT auth, Docker Compose for local and prod.

`architecture.md` is the authoritative design doc — read it before making structural changes. `docker.md` covers the container environments in depth.

## Commands

Everything can run either on the host or inside Docker. Docker is the reproducible path (guarantees Java 21 / Node 22).

### Local dev stack (recommended)
```bash
docker compose -f docker-compose.dev.yml up          # PostgreSQL + Redis + Quarkus dev + Vite, hot reload
docker compose -f docker-compose.dev.yml up --build   # rebuild images
docker compose -f docker-compose.dev.yml down -v       # stop and wipe data volumes
```
Frontend: http://localhost:5173 · Backend REST/WS: http://localhost:8080 · Quarkus Dev UI: http://localhost:8080/q/dev/ · Java debug: localhost:5005

### Backend (`backend/`)
```bash
./mvnw quarkus:dev                # dev mode with live reload
./mvnw package                    # build fast-jar into target/quarkus-app/
./mvnw test                       # run all tests
./mvnw test -Dtest=OmahaEvaluationTest            # single test class
./mvnw test -Dtest=OmahaEvaluationTest#methodName # single test method
```
In Docker: `docker compose -f docker-compose.dev.yml run --rm backend mvn test`

### Frontend (`p-frontend/`, pnpm)
```bash
pnpm dev        # Vite dev server
pnpm build      # tsc -b type-check THEN vite build — build fails on type errors
pnpm lint       # ESLint
```
In Docker: `docker compose -f docker-compose.dev.yml run --rm frontend sh -c "pnpm build && pnpm lint"`

There is no frontend test runner configured. `pnpm build` (which type-checks) + `pnpm lint` are the CI gates.

### Production
```bash
cp .env.example .env    # then edit DB creds, ports, VITE_BACKEND_URL
docker compose -f docker-compose.prod.yml up -d --build
```

## Database & jOOQ (important workflow)

Flyway SQL migrations in `backend/src/main/resources/db/migration` are the **single source of truth** for the schema.

- Quarkus runs migrations at startup (`quarkus.flyway.migrate-at-start=true`).
- **jOOQ generates its classes from the migration SQL files at Maven build time** (via `DDLDatabase` extension) — no live database is needed to build. Consequently, after adding/changing a migration you must rebuild (`./mvnw package` or dev-mode reload) to regenerate jOOQ types before referencing new columns/tables.
- Add schema changes only as new versioned `V#__*.sql` files. Never edit an applied migration.

## Backend architecture

Layered, with the poker rules engine deliberately decoupled from transport/persistence (per `architecture.md`). Key packages under `dev.manestack`:

- `endpoint/rest` — REST resources: `TableResource`, `UserEndpoint`, `AdminEndpoint`, `ChatEndpoint`, `JackpotEndpoint`.
- `endpoint/ws` — WebSocket entry points: `GlobalSocket` (lobby) and `TableSocket` (per-table).
- `service` — orchestration: `GameService` (central hub wiring sockets ↔ game sessions, event queues, thread pools), `UserService`, `ChatService`.
- `service/poker` — the **pure game engine**: card/deck (`FairGameDeck`, `GameDeck`, `GameHand`, `GameHandEvaluator`, `GameHandRank`, `GameVariant`), `PokerScoreService`. This layer must have zero awareness of WebSockets/DB/HTTP.
- `service/poker/table` — table/session state & betting: `GameTable`, `GameSession`, `GameSessionSnapshot`, `BettingService`, `PlayerRoundService`, `PlayerStateService`, `GameSidePot`, `GamePlayer`. `TableManager` lives at `service/poker/TableManager.java`.
- `service/socket` — `WebsocketSession`, `WebsocketEvent` transport primitives.
- `config` — `CustomJWTCallerPrincipalFactory` (strict JWT signature verification — never decode claims without verifying), `Configurator`, `JacksonCustomizer`.

Concurrency note: `GameService` currently drives gameplay via `ExecutorService` thread pools (`GAMEPLAY_THREAD`, `RESPONSE_SENDER_THREAD`) plus per-connection event queues. `architecture.md` describes a target single-threaded-per-table "Table Actor Model"; treat table state mutations as concurrency-sensitive and prefer atomic operations.

### Non-negotiable invariants (from architecture.md)
- **Wallet mutations must be atomic conditional SQL** (`UPDATE wallets SET balance = balance - :amt WHERE user_id = :id AND balance >= :amt`) with an idempotency key. No read-then-write / `containsKey → put` patterns.
- **Engine stays decoupled** — no transport/DB imports in `service/poker`.
- Auth relies exclusively on cryptographically verified JWT claims.

## Frontend architecture

React 19 + Redux Toolkit + React Router 7, native WebSocket client, PWA (`vite-plugin-pwa`). Under `p-frontend/src`:

- `app/` — composition root: `store.ts` (Redux store), `router.tsx`, `provider.tsx`, `app.tsx`.
- `providers/` — cross-cutting React context providers, including `GlobalWebSocketProvider` and `GameProvider` (WebSocket lifecycle), plus `auth-slice.ts` / `theme-slice.ts`.
- `api/` — backend calls: `tablesApi.ts`, `game.ts`, `user.ts`, `admin.ts`.
- `reducers/` — `gameReducer.ts` (core live-game state).
- `features/` — domain UI: `features/poker` (+ `features/poker/texas` for Texas Hold'em table views), `features/user`, `features/admin`.
- `hooks/` — `useTexasTable`, `useWebSocketCleanup`, `useIsMobile`, `useLogout`.
- `pages/`, `components/`, `layout/`, `styles/`, `assets/`, `locales/`, `constants/`, `types/`, `utils/`.

WebSocket state flows: providers open the socket → dispatch events into Redux (`gameReducer`) → feature components read via selectors. When touching sockets, respect the cleanup path in `useWebSocketCleanup`.

`VITE_BACKEND_URL` selects the backend origin (build-time arg in prod images).

## Fresh-database / empty-lobby behavior

An empty lobby is a valid loaded state. The frontend boot sequence must treat a successful empty `GET /api/v1/user/tables` as "loaded", not spin waiting for a table to appear.
