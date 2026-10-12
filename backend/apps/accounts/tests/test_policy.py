from django.contrib.auth.models import AnonymousUser
from django.test import TestCase

from apps.accounts import policy
from apps.accounts.models import Grant, User

from .helpers import make_org, make_patient, make_staff

ALL_ROLES = [r.value for r in Grant.Role]


class PolicyMatrixTests(TestCase):
    def setUp(self):
        self.org_a = make_org("org-a")
        self.org_b = make_org("org-b")
        self.patient_user = make_patient()
        self.patient = self.patient_user.patient_profile
        self.other = make_patient()

    def test_has_grant_by_role_and_scope(self):
        staff = make_staff("clinician", self.org_a)
        self.assertTrue(policy.has_grant(staff))
        self.assertTrue(policy.has_grant(staff, "clinician"))
        self.assertTrue(policy.has_grant(staff, ["admin", "clinician"]))
        self.assertFalse(policy.has_grant(staff, "admin"))
        self.assertTrue(policy.has_grant(staff, "clinician", self.org_a))
        self.assertTrue(policy.has_grant(staff, "clinician", "org-a"))
        self.assertTrue(policy.has_grant(staff, "clinician", self.org_a.pk))
        self.assertTrue(policy.has_grant(staff, "clinician", str(self.org_a.pk)))
        self.assertFalse(policy.has_grant(staff, "clinician", self.org_b))
        self.assertFalse(policy.has_grant(staff, "clinician", "nope"))

    def test_inactive_grant_or_org_does_not_count(self):
        staff = make_staff("admin", self.org_a)
        Grant.objects.filter(user=staff).update(is_active=False)
        self.assertFalse(policy.has_grant(staff, "admin"))
        Grant.objects.filter(user=staff).update(is_active=True)
        self.org_a.is_active = False
        self.org_a.save()
        self.assertFalse(policy.has_grant(staff, "admin"))

    def test_inactive_user_and_anonymous_fail(self):
        staff = make_staff("admin", self.org_a)
        staff.is_active = False
        staff.save()
        self.assertFalse(policy.has_grant(staff, "admin"))
        self.assertFalse(policy.has_grant(AnonymousUser(), "admin"))
        self.assertFalse(policy.has_grant(None, "admin"))
        self.assertFalse(policy.can_view_patient(AnonymousUser(), self.patient))

    def test_superuser_passes_everything(self):
        root = User.objects.create_superuser("root@example.com", "a-long-password-1")
        self.assertTrue(policy.has_grant(root, "admin", "anything"))
        self.assertTrue(policy.can_view_patient(root, self.patient))
        self.assertTrue(policy.can_edit_patient(root, self.patient))

    def test_staff_matrix(self):
        expected_edit = {"admin": True, "clinician": True, "support": True, "customer_success": False, "read_only": False}
        for role in ALL_ROLES:
            with self.subTest(role=role):
                staff = make_staff(role, self.org_a)
                self.assertTrue(policy.can_view_patient(staff, self.patient))
                self.assertEqual(policy.can_edit_patient(staff, self.patient), expected_edit[role])

    def test_staff_without_grant_denied(self):
        staff = make_staff()
        self.assertFalse(policy.can_view_patient(staff, self.patient))
        self.assertFalse(policy.can_edit_patient(staff, self.patient))

    def test_patient_only_own_profile(self):
        self.assertTrue(policy.can_view_patient(self.patient_user, self.patient))
        self.assertTrue(policy.can_edit_patient(self.patient_user, self.patient))
        self.assertFalse(policy.can_view_patient(self.patient_user, self.other.patient_profile))
        self.assertFalse(policy.can_edit_patient(self.patient_user, self.other.patient_profile))

    def test_patient_with_staff_grant_still_not_staff(self):
        Grant.objects.create(user=self.patient_user, organization=self.org_a, role="admin")
        self.assertFalse(policy.can_view_patient(self.patient_user, self.other.patient_profile))

    def test_system_user_denied(self):
        system = User.objects.create_user("sys@example.com", kind=User.Kind.SYSTEM)
        self.assertFalse(policy.can_view_patient(system, self.patient))

    def test_none_profile(self):
        self.assertFalse(policy.can_view_patient(self.patient_user, None))
        self.assertFalse(policy.can_edit_patient(self.patient_user, None))
