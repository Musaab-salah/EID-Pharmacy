"""
Serve React SPA (Admin and POS) for production deployment.
When user visits /admin/ or /app/ (or subpaths), serve the respective index.html.
Static assets (JS, CSS) are served from the dist folders.
"""
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse


def _get_dist_path(subpath: str) -> Path:
    """Get dist folder path. subpath is 'admin' or 'app'."""
    base = Path(settings.BASE_DIR).parent
    return base / f"frontend-{subpath}" / "dist"


def serve_spa_index(request, subpath, path=""):
    """Serve index.html for SPA routes (enables client-side routing)."""
    dist = _get_dist_path(subpath)
    index_html = dist / "index.html"
    if not index_html.exists():
        raise Http404("Frontend not built. Run npm run build in frontend-admin/frontend-app.")
    with open(index_html, "rb") as f:
        return HttpResponse(f.read(), content_type="text/html")


def serve_spa_asset(request, subpath, path):
    """Serve JS/CSS assets from the SPA dist folder."""
    # Block path traversal
    if ".." in path or path.startswith("/"):
        raise Http404()
    dist = _get_dist_path(subpath)
    full_path = (dist / "assets" / path).resolve()
    assets_dir = (dist / "assets").resolve()
    if not full_path.is_file() or not str(full_path).startswith(str(assets_dir)):
        raise Http404()
    ct_map = {".js": "application/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml"}
    content_type = ct_map.get(Path(path).suffix, "application/octet-stream")
    return FileResponse(open(full_path, "rb"), content_type=content_type)
