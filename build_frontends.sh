#!/usr/bin/env bash
# Build Admin + POS for Django monolith (served from /admin/ and /app/).
#
# Render: set Root Directory to the repository root (empty), then use e.g.
#   Build Command:  pip install -r requirements.txt && bash build_frontends.sh
#   Start Command:  python start_render.py
#
# Do not set VERCEL=1 for these builds — Vite must keep base /admin/ and /app/.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> frontend-admin: npm ci && npm run build"
(cd "$ROOT/frontend-admin" && npm ci && npm run build)

echo "==> frontend-app: npm ci && npm run build"
(cd "$ROOT/frontend-app" && npm ci && npm run build)

echo "==> Frontends built under frontend-admin/dist and frontend-app/dist"
