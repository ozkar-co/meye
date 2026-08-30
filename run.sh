#!/usr/bin/env bash
# Service entrypoint for meye-tools (port 3008).
# Safe under systemd: loads the project owner's nvm node when PATH is bare.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Prefer the same Node the project was installed with (nvm), even if
# systemd runs without a login shell PATH.
if [[ -z "${NODE_BIN:-}" ]]; then
  PROJECT_USER="$(stat -c '%U' "$ROOT" 2>/dev/null || true)"
  if [[ -n "${PROJECT_USER}" ]]; then
    PROJECT_HOME="$(getent passwd "$PROJECT_USER" | cut -d: -f6 || true)"
    NVM_DIR="${PROJECT_HOME:-}/.nvm"
    if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
      # shellcheck disable=SC1090
      source "${NVM_DIR}/nvm.sh"
    fi
  fi
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
  echo "error: node not found (set NODE_BIN or install Node 20+ / nvm)" >&2
  echo "PATH=$PATH" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "error: node_modules missing; run npm install as the deploy user first" >&2
  exit 1
fi

echo "building…" >&2
npm run build

export PORT="${PORT:-3008}"
export HOST="${HOST:-0.0.0.0}"

echo "meye-tools starting: node=${NODE_BIN} ($("${NODE_BIN}" -v)) port=${PORT} cwd=${ROOT}" >&2
exec "${NODE_BIN}" dist/server.js
