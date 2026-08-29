# meye-tools

API and CLI for **Tierras de Meye**: item/card calculator and constructed languages.

- Repo: https://github.com/ozkar-co/meye
- Production: https://meye-tools.ozkr.net
- Interactive API docs: `/docs` (OpenAPI / Swagger UI)

## Requirements

- Node.js 20+
- System libs for [`canvas`](https://github.com/Automattic/node-canvas) and `better-sqlite3` (build tools)

## Setup

```bash
npm install
npm run dev          # API on http://localhost:3000
```

Open http://localhost:3000/docs

```bash
npm run build && npm start
npm run cli -- --help
```

## CLI examples

```bash
npm run cli -- item list
npm run cli -- item get Bpi3 DuaA-10
npm run cli -- item card Bpi3 DuaA-10 -o ./out
npm run cli -- lang translate sujfi hola
npm run cli -- lang image sujfi marina -o ./out/marina.png
npm run cli -- materials-table -o ./out/table.png
```

## Data

| Path | Role |
|------|------|
| `data/*.json` | Materials, dictionary, object formulas |
| `data/assets/` | Card art |
| `data/meye.sqlite` | Persisted named items (**tracked in git**) |
| `cache/images/` | Generated PNG cache (gitignored, disposable) |

Env: `PORT`, `HOST`, `DATA_DIR`, `CACHE_DIR`.

## Layout

```
src/
  server.ts          Fastify + Swagger
  cli.ts
  db.ts              SQLite
  cache.ts
  cards/             formulas, codes, render
  languages/sujfi/   translator + image
  routes/
legacy_card_generator/   historical Node reference
```

## Deploy notes

Run `npm start` behind a reverse proxy to `meye-tools.ozkr.net`. Persist `data/meye.sqlite`; `cache/` can be ephemeral.
