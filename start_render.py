from __future__ import annotations

import os
import subprocess
import sys


def main() -> int:
    # Render runs from repo root by default.
    repo_root = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(repo_root, "eid_pharmacy_backend")

    port = os.environ.get("PORT", "10000").strip() or "10000"

    # 1) Migrate
    migrate = subprocess.run(
        [sys.executable, "manage.py", "migrate", "--noinput"],
        cwd=backend_dir,
        check=False,
    )
    if migrate.returncode != 0:
        return migrate.returncode

    # 2) Start gunicorn
    # The ":" is inside Python, not Render Start Command.
    cmd = [
        "gunicorn",
        "eid_pharmacy_backend.wsgi:application",
        "--chdir",
        backend_dir,
        "--bind",
        f"0.0.0.0:{port}",
        "--workers",
        os.environ.get("WEB_CONCURRENCY", "2"),
        "--timeout",
        os.environ.get("GUNICORN_TIMEOUT", "120"),
    ]

    os.execvp(cmd[0], cmd)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

