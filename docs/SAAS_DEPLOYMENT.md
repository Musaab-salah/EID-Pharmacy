# EID Pharmacy — Production SaaS deployment (Render + Vercel + PostgreSQL)

This guide targets **API on Render**, **Admin + POS on Vercel (two projects)**, and **PostgreSQL** (Render managed DB, **Neon**, or **Supabase**). The codebase enforces secure defaults when `DEBUG=false`.

---

## 1. Architecture

| Layer | Host | Notes |
|--------|------|--------|
| Django REST API + JWT | **Render** (Docker) | `Dockerfile` = API-only image |
| Admin (React/Vite) | **Vercel** project #1 | `Root Directory`: `frontend-admin` |
| POS (React/Vite) | **Vercel** project #2 | `Root Directory`: `frontend-app` |
| PostgreSQL | Render Postgres / Neon / Supabase | `DATABASE_URL` |

**Monolith alternative** (API serves built SPAs from `/admin/` and `/app/`): use `Dockerfile.monolith` and set `VITE_API_URL` at Docker build time to your public API URL.

---

## 2. Files created or updated (reference)

| Path | Purpose |
|------|---------|
| `Dockerfile` | Slim API-only image (no Node) |
| `Dockerfile.monolith` | Full stack image (Django + built Admin + POS) |
| `gunicorn.conf.py` | Bind `PORT`, `chdir`, workers |
| `Procfile` | `gunicorn` for PaaS that read Procfile |
| `render.yaml` | Render Blueprint (web + Postgres) |
| `eid_pharmacy_backend/eid_pharmacy_backend/settings.py` | Production security, CORS, CSRF, Postgres |
| `eid_pharmacy_backend/requirements.txt` | gunicorn, whitenoise, dj-database-url, psycopg2-binary, etc. |
| `eid_pharmacy_backend/core/tests.py` | Smoke tests for CI |
| `.github/workflows/ci.yml` | Backend tests + frontend production builds |
| `frontend-admin/src/config.ts` | `VITE_API_URL` required in production builds |
| `frontend-app/src/config.ts` | Same |
| `frontend-admin/src/vite-env.d.ts` | Vite env typings |
| `frontend-app/src/vite-env.d.ts` | Same |
| `frontend-admin/vercel.json` | SPA rewrites |
| `frontend-app/vercel.json` | Same |
| `frontend-admin/.env.production.example` | Template for `VITE_API_URL` |
| `frontend-app/.env.production.example` | Same |

---

## 3. Environment variables

### Backend (Render — or any host)

| Variable | Required (prod) | Example / notes |
|----------|-----------------|-----------------|
| `SECRET_KEY` | **Yes** | Long random string; never commit |
| `DEBUG` | **Yes** | `false` |
| `ALLOWED_HOSTS` | **Yes** | `your-api.onrender.com` or `.onrender.com` |
| `DATABASE_URL` | **Yes** | Postgres URL (Render attaches automatically in Blueprint) |
| `DATABASE_SSL_REQUIRE` | Recommended | `true` for Render/Neon/Supabase; `false` only if DB has no SSL |
| `DATABASE_CONN_MAX_AGE` | Optional | Default `600` |
| `USE_X_FORWARDED_PROTO` | **Yes** (Render) | `true` |
| `SECURE_SSL_REDIRECT` | Optional | `true` when behind HTTPS proxy |
| `CORS_ALLOWED_ORIGINS` | **Yes** | Comma-separated **HTTPS** origins, e.g. `https://admin.vercel.app,https://pos.vercel.app` (no trailing slash) |
| `CSRF_TRUSTED_ORIGINS` | Optional | Same list if unset (copied from CORS in code); set explicitly if you use extra cookie-based flows |
| `CORS_ALLOW_CREDENTIALS` | Optional | `true` only if you send cookies cross-origin |
| `SECURE_HSTS_SECONDS` | Optional | Default `31536000` when `DEBUG=false` |
| `ALLOW_SQLITE_IN_PRODUCTION` | Emergency only | `true` to allow SQLite with `DEBUG=false` (not recommended) |

### Frontend (Vercel — each project)

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_API_URL` | **Yes** | `https://your-api.onrender.com/api` |
| `VERCEL` | Auto | Vercel sets; ensures `base: '/'` in `vite.config.ts` |

Copy `frontend-*/.env.production.example` → `.env.production` for local `npm run build` tests.

### Neon / Supabase

- Use the **connection string** they provide as `DATABASE_URL` (usually includes `sslmode=require`).
- Keep `DATABASE_SSL_REQUIRE=true` unless their docs say otherwise.

---

## 4. Render — exact configuration

1. Push this repository to GitHub.
2. **Render** → **New** → **Blueprint** → select repo → apply `render.yaml`.
3. After the first deploy, open the **Web Service** → **Environment**:
   - Set `CORS_ALLOWED_ORIGINS` to both Vercel production URLs (comma-separated).
   - Set `CSRF_TRUSTED_ORIGINS` to the same if not auto-filled (settings copy from CORS when unset).
4. **Shell** (one-off) or local with `DATABASE_URL`:
   ```bash
   cd eid_pharmacy_backend
   python manage.py migrate
   python manage.py seed_data   # optional dev data
   python manage.py createsuperuser   ```
5. Health check: `GET https://<service>.onrender.com/health/` → `ok`.

**Build**: uses root `Dockerfile` (API-only). No Node on Render.

**Custom domain**: Add domain in Render; put the hostname in `ALLOWED_HOSTS` and in CORS/CSRF lists.

---

## 5. Vercel — exact configuration (two projects)

### Project A — Admin

- **Framework preset**: Vite  
- **Root Directory**: `frontend-admin`  
- **Build Command**: `npm run build` (default)  
- **Output Directory**: `dist`  
- **Environment Variables**: `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`  

`vercel.json` in `frontend-admin` enables SPA fallback rewrites.

### Project B — POS

- **Root Directory**: `frontend-app`  
- Same build/output; set the **same** `VITE_API_URL`.  

Connect each project to the **same Git repo**; Vercel detects the subdirectory.

---

## 6. CI/CD (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

- **On** `push` / `pull_request` to `main` or `master`:
  - Backend: `pip install`, `manage.py check`, `makemigrations --check`, `manage.py test` (SQLite, `DEBUG=True`).
  - Frontends: `npm ci`, `npm run build` with `VERCEL=1` and `VITE_API_URL` set to a dummy HTTPS URL for CI.

**Deploy triggers (recommended)**:

- **Render**: enable **Auto-Deploy** on the service (deploys on push to `main`).
- **Vercel**: enable **Production Branch** = `main` for both projects.

**Optional**: Add a Render **Deploy Hook** and call it from Actions with `curl` + `RENDER_DEPLOY_HOOK_URL` secret if you want deploy only after CI passes (use `workflow_run` or `needs:`).

---

## 7. JWT and security notes

- Tokens are stored in **localStorage** (existing app behavior). For stricter XSS resistance, consider **httpOnly cookies** + CSRF (larger change).
- **HTTPS only** in production: cookies `Secure` flags are set when `DEBUG=false`.
- Rotate `SECRET_KEY` only with a plan to invalidate sessions/JWTs.

---

## 8. SaaS / multi-tenant (future)

- Add `tenant` / `organization` FK on `Branch`, `User`, or a dedicated model.
- Issue JWT claims with `tenant_id`; filter querysets in DRF mixins.
- Per-tenant DB: separate `DATABASE_URL` routing (django-tenants, etc.) — not included here.

---

## 9. Quick checklist

- [ ] `DEBUG=false`, strong `SECRET_KEY`, explicit `ALLOWED_HOSTS`
- [ ] `DATABASE_URL` (Postgres) set
- [ ] `CORS_ALLOWED_ORIGINS` lists both Vercel URLs
- [ ] Vercel **both** projects have `VITE_API_URL` with `/api` suffix
- [ ] `migrate` run on production DB
- [ ] Change default seeded admin password

---

## 10. Troubleshooting

| Symptom | Fix |
|---------|-----|
| CORS error from browser | Add exact Vercel URL (scheme + host, no path) to `CORS_ALLOWED_ORIGINS` |
| 403 CSRF on Django admin | Add origin to `CSRF_TRUSTED_ORIGINS` |
| DB SSL error | `DATABASE_SSL_REQUIRE=true` and valid URL from Neon/Supabase |
| Blank API calls from Vercel | `VITE_API_URL` missing at **build** time — redeploy after setting env |
