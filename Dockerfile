# Production API-only image (SaaS): Django + Gunicorn. Host Admin/POS on Vercel.
# Build: docker build -t eid-api .
# Set env at runtime on Render / your orchestrator (DATABASE_URL, SECRET_KEY, etc.).
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY eid_pharmacy_backend/requirements.txt /app/eid_pharmacy_backend/requirements.txt
RUN pip install --no-cache-dir -r /app/eid_pharmacy_backend/requirements.txt

COPY eid_pharmacy_backend /app/eid_pharmacy_backend
COPY gunicorn.conf.py /app/gunicorn.conf.py

ENV DJANGO_SETTINGS_MODULE=eid_pharmacy_backend.settings

RUN cd /app/eid_pharmacy_backend && python manage.py collectstatic --noinput

EXPOSE 10000
CMD ["sh", "-c", "cd /app/eid_pharmacy_backend && python manage.py migrate --noinput && python manage.py bootstrap_superuser && cd /app && exec gunicorn eid_pharmacy_backend.wsgi:application --config gunicorn.conf.py"]
