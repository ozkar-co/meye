# meye-tools

HTTP API for **Tierras de Meye**: item/card calculator and constructed languages.

- Repo: https://github.com/ozkar-co/meye
- Production: https://meye-tools.ozkr.net
- Interactive API docs: `/docs` (OpenAPI / Swagger UI)

## Requirements

- Node.js 20+
- System libs for [`canvas`](https://github.com/Automattic/node-canvas) and `better-sqlite3` (build tools)

## Setup

```bash
npm install
npm run build
./run.sh                 # API on http://localhost:3008
# or: npm run dev        # watch mode (PORT=3008 by default)
```

Open http://localhost:3008/docs

## Deploy

Custom Debian service runs `./run.sh` in this directory on **port 3008**, reverse-proxied to https://meye-tools.ozkr.net.

Persist `data/meye.sqlite`; `cache/` can be ephemeral.

Env: `PORT` (default 3008), `HOST`, `DATA_DIR`, `CACHE_DIR`.

## Data

| Path | Role |
|------|------|
| `data/*.json` | Materials, dictionary, object formulas |
| `data/assets/` | Card art |
| `data/meye.sqlite` | Persisted named items (**tracked in git**) |
| `cache/images/` | Generated PNG cache (gitignored, disposable) |

## Layout

```
run.sh               service entrypoint (port 3008)
src/
  server.ts          Fastify + Swagger
  db.ts              SQLite
  cache.ts
  cards/
  languages/sujfi/
  routes/
```
