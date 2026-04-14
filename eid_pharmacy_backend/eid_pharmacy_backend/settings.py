"""
Django settings for eid_pharmacy_backend (Pharmacy Eid / EID Pharmacy).

Production: set SECRET_KEY, DEBUG=False, ALLOWED_HOSTS, DATABASE_URL, CORS_ALLOWED_ORIGINS,
CSRF_TRUSTED_ORIGINS (for split Vercel + Render), etc.
Local: defaults work with SQLite and DEBUG=True.
"""

import os
import sys
from datetime import timedelta
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load eid_pharmacy_backend/.env (local secrets; not committed)
load_dotenv(BASE_DIR / ".env")

# --- Security / environment ---
_DEV_SECRET_MARKER = "django-insecure-"
_DEFAULT_DEV_KEY = (
    "django-insecure-f29dz=5xy9)8azh39i2jk66uckje!2)zrjk5y%$wi4gbg=)$mk"
)

SECRET_KEY = os.environ.get("SECRET_KEY", _DEFAULT_DEV_KEY)

DEBUG = os.environ.get("DEBUG", "True").strip().lower() in ("1", "true", "yes", "on")

if not DEBUG:
    if not SECRET_KEY or SECRET_KEY == _DEFAULT_DEV_KEY or _DEV_SECRET_MARKER in SECRET_KEY:
        raise ImproperlyConfigured(
            "Production requires a strong SECRET_KEY environment variable "
            "(not the default insecure key)."
        )

_allowed = os.environ.get("ALLOWED_HOSTS", "*").strip()
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(",") if h.strip()] or ["*"]

if not DEBUG and ALLOWED_HOSTS == ["*"]:
    raise ImproperlyConfigured(
        "Production requires ALLOWED_HOSTS to be set explicitly (comma-separated), "
        "not '*'."
    )

# Behind Render / reverse proxy (HTTPS)
USE_X_FORWARDED_PROTO = os.environ.get("USE_X_FORWARDED_PROTO", "0").strip().lower() in (
    "1",
    "true",
    "yes",
)
if USE_X_FORWARDED_PROTO:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "1").strip().lower() in (
        "1",
        "true",
        "yes",
    )
else:
    SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "0").strip().lower() in (
        "1",
        "true",
        "yes",
    )

if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get(
        "SECURE_HSTS_INCLUDE_SUBDOMAINS", "true"
    ).strip().lower() in ("1", "true", "yes")
    SECURE_HSTS_PRELOAD = os.environ.get("SECURE_HSTS_PRELOAD", "false").strip().lower() in (
        "1",
        "true",
        "yes",
    )
else:
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "eid_pharmacy_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "eid_pharmacy_backend.wsgi.application"

# Database — PostgreSQL via DATABASE_URL in production (Render / Neon / Supabase)
_force_pg = os.environ.get("DATABASE_URL_FORCE_POSTGRES", "").strip().lower() in (
    "1",
    "true",
    "yes",
)
if not DEBUG and _force_pg and not os.environ.get("DATABASE_URL"):
    raise ImproperlyConfigured(
        "DATABASE_URL is required when DEBUG=False and DATABASE_URL_FORCE_POSTGRES is set."
    )

if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            default=os.environ["DATABASE_URL"],
            conn_max_age=int(os.environ.get("DATABASE_CONN_MAX_AGE", "600")),
            ssl_require=os.environ.get("DATABASE_SSL_REQUIRE", "true").lower()
            in ("1", "true", "yes"),
        )
    }
else:
    if not DEBUG and "test" not in sys.argv:
        # Production-style runs should set DATABASE_URL; opt out only if explicitly allowed
        if os.environ.get("ALLOW_SQLITE_IN_PRODUCTION", "").lower() not in (
            "1",
            "true",
            "yes",
        ):
            raise ImproperlyConfigured(
                "Production (DEBUG=False) requires DATABASE_URL (PostgreSQL). "
                "Set ALLOW_SQLITE_IN_PRODUCTION=true only for exceptional debugging."
            )
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Riyadh"
USE_I18N = True
USE_TZ = True

# Static & media
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise: serve Django admin static + collectstatic output
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "core.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# CORS — production must list Vercel (and any) frontend origins explicitly
_cors = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()
if _cors:
    CORS_ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in _cors.split(",") if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    CORS_ALLOW_ALL_ORIGINS = True
    if not DEBUG:
        raise ImproperlyConfigured(
            "Production requires CORS_ALLOWED_ORIGINS (comma-separated HTTPS origins), "
            "e.g. https://admin.vercel.app,https://pos.vercel.app"
        )

CORS_ALLOW_CREDENTIALS = os.environ.get("CORS_ALLOW_CREDENTIALS", "false").strip().lower() in (
    "1",
    "true",
    "yes",
)

# CSRF — Django admin (/backend-admin/) and session POSTs from browser apps
_csrf = os.environ.get("CSRF_TRUSTED_ORIGINS", "").strip()
if _csrf:
    CSRF_TRUSTED_ORIGINS = [
        o.strip().rstrip("/") for o in _csrf.split(",") if o.strip()
    ]
elif not DEBUG:
    CSRF_TRUSTED_ORIGINS = [o.rstrip("/") for o in CORS_ALLOWED_ORIGINS]
    if not CSRF_TRUSTED_ORIGINS:
        raise ImproperlyConfigured(
            "Set CSRF_TRUSTED_ORIGINS or CORS_ALLOWED_ORIGINS for production."
        )
else:
    CSRF_TRUSTED_ORIGINS = []
