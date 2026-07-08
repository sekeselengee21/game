# System Architecture Blueprint

## Current Project Layers and Technologies

| Layer | Technology |
|---|---|
| Project Type | Full-stack poker game app |
| Frontend Runtime | Node.js 22, pnpm |
| Frontend Framework | React 19 + TypeScript |
| Frontend Build Tool | Vite 6 |
| Frontend State | Redux Toolkit, React Redux |
| Frontend Routing | React Router 7 |
| Frontend Realtime | Native WebSocket client |
| Frontend UI / Assets | CSS, SVG / PNG / WebP poker assets, React Icons |
| Frontend PWA | `vite-plugin-pwa`, service worker caching |
| Frontend Audio | Howler |
| Frontend Notifications | React Toastify |
| Backend Runtime | Java 21 |
| Backend Framework | Quarkus 3.22.3 |
| Backend API Layer | Quarkus REST / Jackson |
| Backend Realtime | Quarkus WebSockets Next |
| Backend Auth | JWT via SmallRye JWT + `jjwt`, bcrypt passwords, role checks |
| Game Logic Layer | Java poker engine services under `service/poker` |
| Database | PostgreSQL 15 |
| Schema Management | Flyway SQL migrations under `backend/src/main/resources/db/migration` |
| Data Access | jOOQ 3.20.3 generated from Flyway migrations + PostgreSQL JDBC |
| ORM Dependency | Hibernate ORM Panache is included, but jOOQ appears to be the active data layer |
| Connection Pooling | Quarkus Agroal |
| Cache / Realtime Infra | Redis 7 is configured in Docker and backend dependencies |
| Testing | JUnit Jupiter, Maven Surefire / Failsafe |
| Backend Build Tool | Maven / Quarkus Maven plugin |
| Frontend Production Serving | Nginx serving Vite static build |
| Containerization | Docker + Docker Compose |
| Deployment Config | `docker-compose.dev.yml`, `docker-compose.prod.yml`, backend / frontend production Dockerfiles |

Short version: this project is a React + TypeScript / Vite frontend with a Java 21 Quarkus backend, using PostgreSQL + Flyway + jOOQ for persistence, WebSockets for live poker table updates, JWT for auth, and Docker Compose for local and production infrastructure.

## Architecture Rating

Overall rating: **7.5/10** based on the current stack and structure.

| Area | Rating | Notes |
|---|---:|---|
| Technology choices | 8/10 | Java 21 + Quarkus, React / Vite, PostgreSQL, jOOQ, Redis, and Docker are strong choices for a poker app. |
| Backend architecture | 7/10 | Good separation between REST, WebSocket, services, poker engine, and user / wallet logic. |
| Frontend architecture | 7/10 | Modern React + Redux + routing + assets / audio / PWA support. Good enough for a rich poker UI. |
| Database layer | 8/10 | PostgreSQL + Flyway + jOOQ is a strong combination, and jOOQ now generates from versioned migration files instead of a live hand-managed database. |
| Realtime / game scaling | 5.5/10 | WebSockets exist, but production-grade multiplayer needs actor-style table isolation, sticky routing, Redis or NATS fanout, replay, and deduplication logic. |
| Production readiness | 6.5/10 | Docker setup, Flyway migrations, and reproducible jOOQ generation are in place. CI, stronger financial consistency, and realtime scaling are still needed. |

Current assessment: this is a good MVP or early production foundation, but not yet a fully production-safe real-money poker backend.

| Launch Context | Rating |
|---|---:|
| Demo or closed beta | 8/10 |
| Real-money public launch | 6/10 |

The highest-priority hardening areas are concurrency safety, wallet integrity, WebSocket scaling, and CI/CD.

## Core Architectural Principles

This system is transitioning from a monolithic, single-node application to a high-concurrency, horizontally scalable multiplayer architecture. All future development must strictly adhere to the following principles:

| Principle | Requirement |
|---|---|
| Zero Trust Security | Cryptographic verification is mandatory for all requests. |
| Atomic State Mutations | Game state and wallets are sacred; no concurrent writes are permitted. |
| Decoupled Layers | The core poker rules engine must have zero awareness of WebSockets, databases, or HTTP endpoints. |
| Infrastructure as Code | Local development, testing, and production environments must be identically reproducible via Docker. |

## Security and Data Integrity

### Authentication

JWT verification: `CustomJWTCallerPrincipalFactory` must enforce strict cryptographic signature validation using the environment's public key or secret. Decoding payloads without verification is strictly prohibited.

Role enforcement: `@RolesAllowed` and WebSocket connection handshakes must rely exclusively on verified claims.

### Transactional Wallet Ledger

No read-then-write anti-patterns: memory-based lock checks such as `containsKey -> put` are deprecated.

Atomic SQL updates: all balance changes, including deposits, rake, bets, and buy-ins, must use conditional atomic SQL queries.

```sql
UPDATE wallets
SET balance = balance - :amount
WHERE user_id = :id
  AND balance >= :amount;
```

Idempotency: every financial transaction must include a unique idempotency key to prevent double-charging during network retries.

## Game Engine: Table Actor Model

To resolve critical race conditions, the game engine should adopt a Table Actor Model pattern.

| Component | Requirement |
|---|---|
| Single-threaded mailboxes | Each active poker table exists as an isolated actor. All incoming events, including player actions, bot actions, timeouts, and disconnects, are pushed into a concurrent queue for that table. |
| Sequential processing | The table actor processes its mailbox one command at a time. This guarantees deterministic, race-free state mutations without complex cross-service locking. |
| Monotonic sequencing | Every state change increments a `tableSeq` and `handSeq`, allowing clients to detect missed updates. |

## Real-Time Communication and Scaling

WebSocket state should not remain process-local if the backend needs to scale across multiple servers.

| Component | Current State | Target State |
|---|---|---|
| Payloads | Heavy JSON object graphs sending full table data | Typed DTOs, binary encoding such as Protobuf or MessagePack, and delta-only updates |
| Routing | Random or round-robin load balancing | Sticky routing so players stay pinned to the node hosting their table actor |
| Scaling | In-memory global socket maps | Redis Pub/Sub or NATS JetStream for cross-node broadcasting and spectator fanout |
| Reconnection | Blind resubscription and replay-prone client actions | Cursor-based resumes using `actionId` and server-side deduplication |

## Persistence and Database

Migration management: Flyway is implemented. Schema changes must be versioned as SQL scripts in `backend/src/main/resources/db/migration`.

jOOQ generation: jOOQ now uses `org.jooq.meta.extensions.ddl.DDLDatabase` to generate classes from Flyway migration SQL. Maven and Docker builds no longer need a live database for jOOQ code generation.

Initial baseline: `V1__baseline_schema.sql` creates the current poker tables, wallet tables, jackpot table, game-session snapshots, hand history, chat messages, and supporting indexes.

Transition note: `quarkus.flyway.baseline-on-migrate=true` is enabled so existing non-empty hand-managed databases can adopt Flyway history. Remove it after every environment has a Flyway schema history table.

Fresh database behavior: an empty lobby is valid. The frontend boot sequence must treat a successful empty `GET /api/v1/user/tables` response as loaded instead of waiting forever for at least one table.

Hand history: eliminate `max(hand_number) + 1` queries. Use native database sequences or UUIDv7 identifiers for race-free ID generation.

## Development Startup

Local dev startup uses `docker-compose.dev.yml` to run PostgreSQL, Redis, Quarkus dev mode, and Vite together.

Frontend startup: the Dockerized frontend runs `pnpm install --no-frozen-lockfile` before `pnpm dev --host 0.0.0.0` so the dev container can recover when `package.json` and `pnpm-lock.yaml` are out of sync during active development.

Backend startup: the Dockerized backend runs Quarkus dev mode with `-Ddebug=5005`, exposing HTTP on `8080` and the debugger on `5005`.

## Automation and CI/CD

To support multi-agent coding and clean deployments, the infrastructure must be standardized.

Docker Compose: the root Compose stack should spin up PostgreSQL, Redis, the Quarkus backend, and the React frontend together.

CI pipeline: introduce GitHub Actions or equivalent on every pull request.

Mandatory checks:

- Backend tests on Java 21.
- Frontend type checks.
- Frontend linting.
- Docker image build verification.
- No deployment scripts using `-DskipTests`.
