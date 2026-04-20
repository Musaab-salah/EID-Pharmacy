from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "admin")


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return bool(getattr(request, "user", None) and request.user.is_authenticated)
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "admin")


class RolePermission(BasePermission):
    """
    Small RBAC helper.

    View can define:
      - allowed_roles: set[str]
      - write_roles: set[str] (optional; defaults to allowed_roles)
    """

    def has_permission(self, request, view) -> bool:
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False

        allowed_roles = set(getattr(view, "allowed_roles", set()) or set())
        if not allowed_roles:
            return True

        user_role = getattr(user, "role", None)
        if user_role not in allowed_roles:
            return False

        if request.method in SAFE_METHODS:
            return True

        write_roles = set(getattr(view, "write_roles", None) or allowed_roles)
        return user_role in write_roles

