"""
URL configuration for eid_pharmacy_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import include, path, re_path
from rest_framework_simplejwt.views import TokenRefreshView

from core.auth_views import LogoutView, TokenObtainPairWithSessionView

from .spa_views import serve_spa_asset, serve_spa_index


def health(_request):
    return HttpResponse("ok", content_type="text/plain")


# Django admin at /backend-admin/ to avoid conflict with React Admin at /admin/
urlpatterns = [
    path("", lambda _r: redirect("/app/", permanent=False)),
    path("health/", health),
    path('backend-admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/auth/token/', TokenObtainPairWithSessionView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='auth_logout'),
    re_path(r'^admin/assets/(?P<path>.+)$', lambda r, path: serve_spa_asset(r, 'admin', path)),
    re_path(r'^app/assets/(?P<path>.+)$', lambda r, path: serve_spa_asset(r, 'app', path)),
    re_path(r'^admin/?$', lambda r: serve_spa_index(r, 'admin')),
    re_path(r'^admin/(?P<path>.*)$', lambda r, path: serve_spa_index(r, 'admin', path)),
    re_path(r'^app/?$', lambda r: serve_spa_index(r, 'app')),
    re_path(r'^app/(?P<path>.*)$', lambda r, path: serve_spa_index(r, 'app', path)),
]

# Product images & uploads (POS/Admin) — needed in production when not using S3
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
