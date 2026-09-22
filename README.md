# ai-pathfinder-web

Next.js frontend for the Romania map pathfinder. API: [`ai-pathfinder-api`](https://github.com/CeiRomaniaMapPathFinder/ai-pathfinder-api).

## Setup

```bash
nvm use                  # Node 22
npm i -g pnpm@11.11.0
pnpm install
cp .env.example .env.local
pnpm dev
```

http://localhost:3000

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Dev server, port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve a production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Route types, then `tsc --noEmit` |

CI runs `lint`, `typecheck` and a Docker build.

## Environment

| Variable | Set where |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `.env.local` for dev, GitHub repo variable for deploys |
| `NEXT_PUBLIC_ASTAR_TREE_API_URL` | Full endpoint for the A* search tree page (`/page3`). Unset → serves `lib/mockAStarTreeResponse.json`. Contract in `lib/astarTreeApi.ts` |
| `APP_COMMIT` | Docker build arg `GIT_SHA`, `unknown` locally |

`NEXT_PUBLIC_API_URL` is baked into the bundle at build time. Setting it in Dokploy does nothing — change the repo variable and redeploy.

To test against a real backend: run `ai-pathfinder-api` on port 8080, keep `.env.local`'s default, and run `pnpm dev` on port 3000 (backend CORS only allows that origin by default). Without a backend running, `pnpm dev` falls back to the fixture in `lib/mockSearchResponse.json`.

## Docker

```bash
docker build --build-arg GIT_SHA=$(git rev-parse HEAD) --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 -t pathfinder-web:local .
docker run --rm -p 3000:3000 pathfinder-web:local
```

`NEXT_PUBLIC_API_URL` has no default in the Dockerfile, so a local build needs the build arg.

## Deploy

Push to `main` → image to GHCR → Dokploy redeploy → waits for `/api/build-info` to report the new commit. A failed deploy rolls back automatically.

`/api/build-info` returns `{"status":"UP","commit":"<sha>"}`. Don't rename `commit` — `deploy.yaml` parses it.
