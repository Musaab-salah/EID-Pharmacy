# Pharmacy Eid — Production deployment runbook

**SaaS split (Render API + Vercel Admin/POS):** see **[SAAS_DEPLOYMENT.md](SAAS_DEPLOYMENT.md)**.

## 1. What this project is

| Layer | Stack | Entry point |
|-------|--------|-------------|
| **Backend** | **Django 4.2** + Django REST Framework + JWT | `eid_pharmacy_backend/eid_pharmacy_backend/wsgi.py` |
| **Admin UI** | React (Vite) | Built to `frontend-admin/dist/`, served at `/admin/` |
| **POS UI** | React (Vite) | Built to `frontend-app/dist/`, served at `/app/` |

Not FastAPI or Flask.

## 2. Hosting choice (free)

| Provider | Best for this pharmacy app |
|----------|----------------------------|
| **Render (Docker + free Postgres)** | **Recommended**: persistent DB, HTTPS, one URL for API + Admin + POS. Cold start after ~15 min idle. |
| **HidenCloud / Heroku-style** | Connect GitHub repo, set **build** to `./build.sh` (or build frontends in CI), **start** to `gunicorn eid_pharmacy_backend.wsgi:application --config gunicorn.conf.py` from repo root. Ensure the build image has **Node 18+** and **Python 3.12**. Add `DATABASE_URL` if the host provides Postgres. |
| **PythonAnywhere** | SQLite + smaller scale; good if you avoid Docker. See `DEPLOYMENT.md` in repo root. |

## 3. Files added for production

- `requirements.txt` — includes `gunicorn`, `whitenoise`, `dj-database-url`, `psycopg2-binary`
- `Procfile` — `gunicorn` (PaaS)
- `runtime.txt` — Python 3.12.7
- `gunicorn.conf.py` — bind `PORT`, `chdir` into Django project
- `build.sh` — builds both frontends + `migrate` + `collectstatic`
- `Dockerfile` — Node 20 + Python; **preferred for Render**
- `render.yaml` — Blueprint (web + Postgres)
- `.env.example` — environment variable template

## 4. GitHub (you must do this — cannot be automated from here)

```bash
cd /path/to/EID\ Pharmacy
git init
git add .
git commit -m "Pharmacy Eid — production deploy config"
# Create empty repo on GitHub, then:
git remote add origin https://github.com/YOUR_USER/eid-pharmacy.git
git branch -M main
git push -u origin main
```

In Render: **New → Blueprint** → select repo → apply `render.yaml`.  
Enable **Auto-Deploy** on push in the service **Settings**.

## 5. Environment variables (Render)

Set in the dashboard (Blueprint sets some automatically):

| Variable | Example |
|----------|---------|
| `SECRET_KEY` | Long random string (Render can generate) |
| `DEBUG` | `false` |
| `ALLOWED_HOSTS` | `.onrender.com` or your custom domain |
| `DATABASE_URL` | From Render Postgres (**required** for persistent data on Render) |
| `USE_X_FORWARDED_PROTO` | `true` |
| `CORS_ALLOWED_ORIGINS` | `https://your-service.onrender.com` (if you split frontends later) |

After first deploy, run **Shell** on Render or a one-off job:

```bash
cd /app/eid_pharmacy_backend
python manage.py seed_data
# Optional custom superuser (custom User model):
python manage.py createsuperuser
```

Default seed login (if `seed_data` ran): `admin@eidpharmacy.local` / `Admin123!` — **change immediately**.

## 6. Public URLs (after deploy)

Replace `YOUR-SERVICE` with your Render service name:

- **HTTPS app**: `https://YOUR-SERVICE.onrender.com`
- **Admin SPA**: `https://YOUR-SERVICE.onrender.com/admin/`
- **POS**: `https://YOUR-SERVICE.onrender.com/app/`
- **API**: `https://YOUR-SERVICE.onrender.com/api/`
- **Health**: `https://YOUR-SERVICE.onrender.com/health/`
- **Django admin**: `https://YOUR-SERVICE.onrender.com/backend-admin/`

Frontends use same-origin `/api` in production builds (see `frontend-*/src/config.ts`).

## 7. Redeploy & updates

- **Auto**: push to `main` (if auto-deploy is on).
- **Manual**: Render dashboard → **Manual Deploy → Clear build cache & deploy**.

## 8. Logs & debugging

- Render: service → **Logs** (build + runtime).
- Common issues:
  - **502**: `gunicorn` crash — check logs; often missing `DATABASE_URL` or migration error.
  - **White screen on /admin or /app**: frontends not built — ensure Docker `build` or `build.sh` ran.
  - **Static/media**: `collectstatic` in build; product images under `/media/` (ephemeral disk on free tier — consider object storage for serious production).

## 9. What I cannot do for you

Creating the GitHub repository, pushing with your credentials, clicking through Render signup, or returning a real **HTTPS link** requires **your** accounts. After you connect the repo once, the platform gives you the public URL.
