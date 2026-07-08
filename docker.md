# Docker Environments

This project uses Docker to keep local development and production deployment aligned with the standards in [architecture.md](./architecture.md).

The repository layout is:

```text
game/
├── backend/                 # Quarkus Java 21 backend
│   ├── Dockerfile.prod
│   └── .dockerignore
├── p-frontend/              # React/Vite frontend
│   ├── Dockerfile.prod
│   ├── nginx.conf
│   └── .dockerignore
├── docker-compose.dev.yml   # Local hot-reload environment
├── docker-compose.prod.yml  # Production environment
└── .env.example             # Production environment template
```

## Development

The development stack is designed for hot reload. Source code is mounted into containers, Maven dependencies are cached, and frontend dependencies are installed into a container volume.

Services:

- `db`: PostgreSQL 15
- `redis`: Redis 7
- `backend`: Maven + Eclipse Temurin Java 21 running Quarkus dev mode
- `frontend`: Node 22 + pnpm running Vite dev server

Start development:

```bash
docker compose -f docker-compose.dev.yml up
```

Rebuild and start if needed:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Stop development:

```bash
docker compose -f docker-compose.dev.yml down
```

Remove development data volumes:

```bash
docker compose -f docker-compose.dev.yml down -v
```

Useful URLs:

- Frontend: `http://localhost:5173`
- Backend REST/WebSockets: `http://localhost:8080`
- Java debug port: `localhost:5005`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Development environment variables are defined directly in [docker-compose.dev.yml](./docker-compose.dev.yml):

```yaml
QUARKUS_DATASOURCE_JDBC_URL: jdbc:postgresql://db:5432/poker_db
QUARKUS_DATASOURCE_USERNAME: poker_user
QUARKUS_DATASOURCE_PASSWORD: devpassword123
QUARKUS_REDIS_HOSTS: redis://redis:6379
VITE_BACKEND_URL: http://localhost:8080
```

## Production

The production stack builds optimized images and does not mount source code into the runtime containers.

Services:

- `db`: PostgreSQL 15 with persistent volume
- `redis`: Redis 7 with append-only persistence
- `backend`: Quarkus fast-jar running on Eclipse Temurin Java 21 JRE
- `frontend`: Static Vite build served by Nginx

Create a production environment file:

```bash
cp .env.example .env
```

Edit `.env` before deploying:

```dotenv
DB_USER=poker_prod_user
DB_PASSWORD=change_me
DB_NAME=poker_db

BACKEND_PORT=8080
FRONTEND_PORT=80

VITE_BACKEND_URL=https://your-domain.example
```

Start production:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

View production logs:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

Check production status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Stop production:

```bash
docker compose -f docker-compose.prod.yml down
```

Stop production and remove data volumes:

```bash
docker compose -f docker-compose.prod.yml down -v
```

The production deploy helper now uses the same Compose stack:

```bash
backend/production-scripts/deploy-to-production.sh
```

## Backend Production Image

[backend/Dockerfile.prod](./backend/Dockerfile.prod) uses a multi-stage build:

1. `maven:3.9.6-eclipse-temurin-21` builds the Quarkus application.
2. `eclipse-temurin:21-jre-alpine` runs only the compiled fast-jar artifacts.
3. The runtime container uses a non-root `appuser`.

jOOQ code generation is offline and reads versioned Flyway SQL migrations from [backend/src/main/resources/db/migration](./backend/src/main/resources/db/migration). The production image no longer needs access to a live database during build.

## Frontend Production Image

[p-frontend/Dockerfile.prod](./p-frontend/Dockerfile.prod) uses a multi-stage build:

1. `node:22-alpine` installs dependencies with pnpm and runs the Vite build.
2. `nginx:1.27-alpine` serves the static `dist` output.

The image accepts this build argument:

```text
VITE_BACKEND_URL
```

[p-frontend/nginx.conf](./p-frontend/nginx.conf) includes SPA fallback routing:

```nginx
try_files $uri $uri/ /index.html;
```

## Validation

Validate Compose files without starting containers:

```bash
docker compose -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.prod.yml config --quiet
```

Build production images:

```bash
docker compose -f docker-compose.prod.yml build
```

Run backend tests inside Java 21:

```bash
docker compose -f docker-compose.dev.yml run --rm backend mvn test
```

Run frontend checks inside Node:

```bash
docker compose -f docker-compose.dev.yml run --rm frontend sh -c "pnpm build && pnpm lint"
```

## Schema Management

Flyway migrations are the source of truth for the backend schema. Quarkus runs migrations at startup, and jOOQ generates classes from the same migration files during Maven builds.

The initial migration is [backend/src/main/resources/db/migration/V1__baseline_schema.sql](./backend/src/main/resources/db/migration/V1__baseline_schema.sql).

Existing non-empty databases can be adopted through Flyway baseline-on-migrate. After every environment has a Flyway schema history table, remove `quarkus.flyway.baseline-on-migrate=true` from [backend/src/main/resources/application.properties](./backend/src/main/resources/application.properties).
