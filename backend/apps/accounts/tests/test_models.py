from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import Grant, User

from .helpers import make_org, make_staff


class UserModelTests(TestCase):
    def test_create_user_normalizes_email_and_has_no_password(self):
        user = User.objects.create_user("  Mixed@Example.COM ")
        self.assertEqual(user.email, "mixed@example.com")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.kind, User.Kind.PATIENT)
        self.assertFalse(user.is_staff)

    def test_email_unique_case_insensitive(self):
        User.objects.create_user("a@example.com")
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user("A@EXAMPLE.COM")

    def test_email_required(self):
        with self.assertRaises(ValueError):
            User.objects.create_user("")

    def test_superuser_requires_password_and_flags(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser("root@example.com")
        root = User.objects.create_superuser("root@example.com", "a-long-password-1")
        self.assertTrue(root.is_staff and root.is_superuser)
        self.assertEqual(root.kind, User.Kind.STAFF)
        self.assertTrue(root.check_password("a-long-password-1"))

    def test_str_has_no_phi(self):
        user = User.objects.create_user("secret@example.com", first_name="Jane", last_name="Doe")
        self.assertNotIn("secret", str(user))
        self.assertNotIn("Jane", str(user))

    def test_is_locked(self):
        user = User.objects.create_user("l@example.com")
        self.assertFalse(user.is_locked)
        user.locked_until = timezone.now() + timedelta(minutes=1)
        self.assertTrue(user.is_locked)
        user.locked_until = timezone.now() - timedelta(minutes=1)
        self.assertFalse(user.is_locked)

    def test_grant_unique(self):
        org = make_org()
        staff = make_staff("admin", org)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Grant.objects.create(user=staff, organization=org, role="admin")

    def test_uses_uuid_pk(self):
        self.assertEqual(len(str(User.objects.create_user("u@example.com").pk)), 36)
