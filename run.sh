#!/usr/bin/env bash
# Service entrypoint for meye-tools (port 3008).
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -d node_modules ]]; then
  echo "error: node_modules missing; run npm install first" >&2
  exit 1
fi

if [[ ! -f dist/server.js ]]; then
  echo "building…"
  npm run build
fi

export PORT="${PORT:-3008}"
export HOST="${HOST:-0.0.0.0}"

exec node dist/server.js
