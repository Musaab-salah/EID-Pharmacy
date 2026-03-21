#!/usr/bin/env bash
# Full production build: React SPAs + Django collectstatic + migrations
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Node $(node -v 2>/dev/null || echo 'missing') / npm $(npm -v 2>/dev/null || echo 'missing')"

echo "==> frontend-admin: npm ci && npm run build"
cd "$ROOT/frontend-admin"
npm ci
npm run build
cd "$ROOT"

echo "==> frontend-app: npm ci && npm run build"
cd "$ROOT/frontend-app"
npm ci
npm run build
cd "$ROOT"

echo "==> Python: pip install"
python -m pip install --upgrade pip
pip install -r eid_pharmacy_backend/requirements.txt

echo "==> Django: migrate + collectstatic"
cd "$ROOT/eid_pharmacy_backend"
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "==> Optional seed (safe to re-run)"
python manage.py seed_data || true

cd "$ROOT"
echo "==> Build finished."
