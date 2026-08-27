# ai-pathfinder-web

Next.js frontend for the Romania map pathfinder. Talks to [`ai-pathfinder-api`](https://github.com/CeiRomaniaMapPathFinder/ai-pathfinder-api).

## Requirements

- Node 22 (`.nvmrc`) — `nvm use`
- pnpm 11 (pinned via `packageManager`) — `corepack enable` picks the right version automatically

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server with hot reload on port 3000 |
| `pnpm build` | Production build (standalone output) |
| `pnpm start` | Serve a production build locally |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Generates route types, then `tsc --noEmit` |

CI runs `pnpm lint`, `pnpm typecheck` and a Docker build — the same commands you run locally, so a green local run means a green CI run.

`pnpm typecheck` runs `next typegen` first. Next generates route types such as `LayoutProps` into `.next/types`, which do not exist on a fresh clone; bare `tsc --noEmit` fails without them.

## Environment

| Variable | Where it is set | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `.env.local` for dev, Dokploy for deployed environments | Base URL of the pathfinder API |
| `APP_COMMIT` | Injected by the Docker build via `--build-arg GIT_SHA` | Commit SHA reported by `/api/build-info` |

`APP_COMMIT` is unset locally, so `/api/build-info` returns `"unknown"` during development. That is expected.

## Build info endpoint

```bash
curl http://localhost:3000/api/build-info
# {"status":"UP","commit":"unknown"}
```

Deployed, `commit` is the SHA of the running build. The deploy workflow polls this endpoint until it reports the commit it just pushed, so a deploy only passes once the new build is actually live.

## Docker

```bash
docker build --build-arg GIT_SHA=$(git rev-parse HEAD) -t pathfinder-web:local .
docker run --rm -p 3000:3000 pathfinder-web:local
```

Multi-stage build producing a standalone Next server that runs as a non-root user on port 3000.

## Deployment

Push to `main` builds an image, pushes it to GHCR as `ghcr.io/ceiromaniamappathfinder/ai-pathfinder-web`, triggers a Dokploy redeploy, and waits for `/api/build-info` to report the new commit. Rolling back means pointing the Dokploy app at a previous `sha-<commit>` tag and redeploying.
