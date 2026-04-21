"""Create the first superuser from environment variables (e.g. Render one-time bootstrap).

Set on the host, then remove BOOTSTRAP_SUPERUSER_PASSWORD after first successful deploy:

  BOOTSTRAP_SUPERUSER_EMAIL=you@example.com
  BOOTSTRAP_SUPERUSER_PASSWORD=your-secure-password

Optional:
  BOOTSTRAP_SUPERUSER_NAME=Admin
  BOOTSTRAP_SUPERUSER_USERNAME=admin   (defaults to local part of email)

Runs only when no superuser exists yet.
"""

import os

from django.core.management.base import BaseCommand

from core.models import User


class Command(BaseCommand):
    help = "Create initial superuser from BOOTSTRAP_SUPERUSER_* env if none exists."

    def handle(self, *args, **options):
        email = os.environ.get("BOOTSTRAP_SUPERUSER_EMAIL", "").strip()
        password = os.environ.get("BOOTSTRAP_SUPERUSER_PASSWORD", "")
        if not email or not password:
            self.stdout.write("bootstrap_superuser: BOOTSTRAP_* not set, skipping.")
            return

        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.WARNING(
                    "bootstrap_superuser: a superuser already exists; skipping."
                )
            )
            return

        name = (os.environ.get("BOOTSTRAP_SUPERUSER_NAME") or "Admin").strip() or "Admin"
        username_raw = (os.environ.get("BOOTSTRAP_SUPERUSER_USERNAME") or "").strip()
        username = username_raw or email.split("@", 1)[0][:150]

        if User.objects.filter(email=email).exists():
            user = User.objects.get(email=email)
            user.set_password(password)
            user.name = name or user.name
            user.username = username
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.role = User.ROLE_ADMIN
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f"bootstrap_superuser: promoted existing user {email} to superuser."
                )
            )
            return

        # Avoid username collision with another row
        base = username
        n = 0
        while User.objects.filter(username=username).exclude(email=email).exists():
            n += 1
            username = f"{base}_{n}"[:150]

        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            name=name,
            role=User.ROLE_ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.stdout.write(
            self.style.SUCCESS(f"bootstrap_superuser: created superuser {user.email}")
        )
