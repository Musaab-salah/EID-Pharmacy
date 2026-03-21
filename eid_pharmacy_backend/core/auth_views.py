"""Custom auth views for login/logout tracking."""
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import UserSession


class TokenObtainPairWithSessionView(TokenObtainPairView):
    """JWT login that also creates a UserSession for attendance tracking."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            from .models import User
            try:
                email = request.data.get("email") or request.data.get("username")
                if not email:
                    return response
                user = User.objects.get(email=email)
                source = request.data.get("source", "app")
                if source not in (UserSession.SOURCE_ADMIN, UserSession.SOURCE_APP):
                    source = UserSession.SOURCE_APP
                UserSession.objects.create(user=user, login_at=timezone.now(), source=source)
            except (User.DoesNotExist, TypeError, ValueError):
                pass
        return response


class LogoutView(APIView):
    """Record logout time for the current user's latest session."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session = (
            UserSession.objects.filter(user=request.user, logout_at__isnull=True)
            .order_by("-login_at")
            .first()
        )
        if session:
            session.logout_at = timezone.now()
            session.save()
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
