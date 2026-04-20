from __future__ import annotations

from typing import Optional

from django.db.models import QuerySet


class BranchScopedQuerysetMixin:
    """
    Centralize branch scoping rules.

    Conventions:
    - If user.role == 'admin' => no scoping.
    - If user.branch_id is set:
      - For models with FK `branch_id` => filter(branch_id=user.branch_id)
      - For models with M2M `branches` => filter(branches__id=user.branch_id).distinct()
    """

    scope_fk_field: str = "branch_id"
    scope_m2m_field: str = "branches"

    def _is_admin(self) -> bool:
        u = getattr(self.request, "user", None)
        return bool(u and getattr(u, "role", None) == "admin")

    def _user_branch_ids(self) -> list[int]:
        u = getattr(self.request, "user", None)
        if not u:
            return []
        ids = []
        try:
            ids = list(u.branches.values_list("id", flat=True))
        except Exception:
            ids = []
        if not ids and getattr(u, "branch_id", None):
            ids = [int(u.branch_id)]
        return ids

    def scope_queryset_to_user(self, qs: QuerySet) -> QuerySet:
        if self._is_admin():
            return qs
        branch_ids = self._user_branch_ids()
        if not branch_ids:
            return qs

        model = getattr(qs, "model", None)
        if model is None:
            return qs

        # FK scoping
        fk_field = getattr(self, "scope_fk_field", "branch_id")
        try:
            model._meta.get_field(fk_field.replace("_id", ""))
            return qs.filter(**{f"{fk_field}__in": branch_ids})
        except Exception:
            pass

        # M2M scoping
        m2m_field = getattr(self, "scope_m2m_field", "branches")
        try:
            model._meta.get_field(m2m_field)
            return qs.filter(**{f"{m2m_field}__id__in": branch_ids}).distinct()
        except Exception:
            return qs

    def get_queryset(self):
        qs = super().get_queryset()
        return self.scope_queryset_to_user(qs)

