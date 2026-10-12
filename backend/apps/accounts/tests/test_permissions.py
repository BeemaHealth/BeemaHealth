from django.test import RequestFactory, TestCase
from rest_framework.exceptions import PermissionDenied

from apps.accounts.permissions import HasGrant, IsOwnerPatient, IsPatient, IsStaffUser, get_patient_profile, grant_required
from apps.accounts.models import User

from .helpers import make_org, make_patient, make_staff


def req(user):
    r = RequestFactory().get("/")
    r.user = user
    return r


class View:
    pass


class PermissionTests(TestCase):
    def test_get_patient_profile(self):
        p = make_patient()
        self.assertEqual(get_patient_profile(p), p.patient_profile)

    def test_get_patient_profile_denied_cases(self):
        staff = make_staff()
        noprofile = User.objects.create_user("n@example.com")
        inactive = make_patient()
        inactive.is_active = False
        for user in (staff, noprofile, inactive, None):
            with self.subTest(user=user), self.assertRaises(PermissionDenied):
                get_patient_profile(user)

    def test_is_patient_and_staff(self):
        p, s = make_patient(), make_staff()
        self.assertTrue(IsPatient().has_permission(req(p), None))
        self.assertFalse(IsPatient().has_permission(req(s), None))
        self.assertTrue(IsStaffUser().has_permission(req(s), None))
        self.assertFalse(IsStaffUser().has_permission(req(p), None))

    def test_has_grant_configurable(self):
        org = make_org("o1")
        staff = make_staff("support", org)
        self.assertTrue(HasGrant().has_permission(req(staff), View()))
        v = View()
        v.required_roles = ["admin"]
        self.assertFalse(HasGrant().has_permission(req(staff), v))
        self.assertTrue(grant_required("support", scope="o1")().has_permission(req(staff), View()))
        self.assertFalse(grant_required("support", scope="o2")().has_permission(req(staff), View()))

    def test_is_owner_patient(self):
        a, b = make_patient(), make_patient()
        perm = IsOwnerPatient()
        from apps.patients.models import Allergy

        mine = Allergy.objects.create(patient=a.patient_profile, name="x")
        self.assertTrue(perm.has_object_permission(req(a), None, mine))
        self.assertFalse(perm.has_object_permission(req(b), None, mine))
        self.assertTrue(perm.has_object_permission(req(a), None, a.patient_profile))
        self.assertFalse(perm.has_object_permission(req(b), None, a.patient_profile))
        self.assertFalse(perm.has_object_permission(req(make_staff()), None, mine))
