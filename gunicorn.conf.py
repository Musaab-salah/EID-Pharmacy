# Run from repository root: gunicorn eid_pharmacy_backend.wsgi:application --config gunicorn.conf.py
import os

_root = os.path.dirname(os.path.abspath(__file__))

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
chdir = os.path.join(_root, "eid_pharmacy_backend")
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))
threads = int(os.environ.get("GUNICORN_THREADS", "1"))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
worker_class = "sync"
accesslog = "-"
errorlog = "-"
capture_output = True
