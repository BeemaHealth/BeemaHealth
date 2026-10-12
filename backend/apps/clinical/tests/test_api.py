import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.helpers import make_org, make_patient, make_staff
from apps.audit.models import AuditEvent
from apps.clinical.models import ActionItem, DoseLog, HealthMetric, Treatment
from apps.patients import export as patient_export

from .helpers import StubbedHooksMixin, make_plan, make_product, make_treatment, make_variant, make_visit

S = Treatment.Status
B = "/api/v1/treatments/"


class ApiBase(StubbedHooksMixin, TestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.user_a, self.user_b = make_patient("a@example.com"), make_patient("b@example.com")
        self.a, self.b = self.user_a.patient_profile, self.user_b.patient_profile
        self.client = APIClient()
        self.client.force_authenticate(self.user_a)
        self.product = make_product("weight-loss-glp1")
        self.variant = make_variant(self.product, "2.50")
        self.plan = make_plan(self.product, self.variant)

    def treatment(self, profile=None, status=S.ACTIVE, **extra):
        return make_treatment(profile or self.a, status, product=self.product, variant=self.variant, plan=self.plan, **extra)


class AuthTests(ApiBase):
    def test_all_endpoints_reject_anonymous_and_staff(self):
        t = self.treatment()
        d = DoseLog.objects.create(treatment=t, scheduled_at=timezone.now())
        paths = [B, B + "home/", f"{B}{t.pk}/", B + "dose-logs/", f"{B}dose-logs/{d.pk}/", B + "health-metrics/", B + "action-items/"]
        staff = APIClient()
        staff.force_authenticate(make_staff("admin", make_org()))
        for path in paths:
            with self.subTest(path=path):
                self.assertIn(APIClient().get(path).status_code, (401, 403))
                self.assertEqual(staff.get(path).status_code, 403)


class TreatmentApiTests(ApiBase):
    def test_list_tabs(self):
        active = self.treatment(status=S.ACTIVE)
        pending = self.treatment(status=S.PENDING_VISIT)
        past = self.treatment(status=S.ENDED)
        def ids(q):
            return {r["id"] for r in self.client.get(B + q).json()["results"]}
        self.assertEqual(ids("?tab=active"), {str(active.pk)})
        self.assertEqual(ids("?tab=pending"), {str(pending.pk)})
        self.assertEqual(ids("?tab=past"), {str(past.pk)})
        self.assertEqual(ids(""), {str(active.pk), str(pending.pk), str(past.pk)})

    def test_patient_cannot_see_other_patients_treatments(self):
        mine, theirs = self.treatment(), self.treatment(self.b)
        self.assertEqual({r["id"] for r in self.client.get(B).json()["results"]}, {str(mine.pk)})
        self.assertEqual(self.client.get(f"{B}{theirs.pk}/").status_code, 404)
        self.assertEqual(self.client.post(f"{B}{theirs.pk}/cancel/").status_code, 404)
        theirs.refresh_from_db()
        self.assertEqual(theirs.status, S.ACTIVE)

    def test_detail_includes_visits_prescriptions_and_next_dose(self):
        t = self.treatment()
        make_visit(t)
        DoseLog.objects.create(treatment=t, scheduled_at=timezone.now() + timedelta(days=2))
        data = self.client.get(f"{B}{t.pk}/").json()
        self.assertEqual(len(data["visits"]), 1)
        self.assertIsNotNone(data["next_dose"])
        self.assertEqual(data["tab"], "active")
        self.assertEqual(data["product_slug"], "weight-loss-glp1")
        self.assertNotIn("network", data)

    def test_detail_read_is_audited(self):
        t = self.treatment()
        self.client.get(f"{B}{t.pk}/")
        self.assertTrue(AuditEvent.objects.filter(action="read", patient_id=self.a.pk).exists())

    def test_cancel_before_submission(self):
        t = self.treatment(status=S.AWAITING_VISIT_COMPLETION)
        r = self.client.post(f"{B}{t.pk}/cancel/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "canceled")
        self.hooks["refund_canceled_before_submission"].assert_called_once()

    def test_cancel_after_submission_is_conflict(self):
        t = self.treatment(status=S.PENDING_VISIT, submitted_to_network_at=timezone.now())
        self.assertTrue(self.client.get(f"{B}{t.pk}/").json()["can_cancel"] is False)
        r = self.client.post(f"{B}{t.pk}/cancel/")
        self.assertEqual(r.status_code, 409)
        t.refresh_from_db()
        self.assertEqual(t.status, S.PENDING_VISIT)
        self.hooks["refund_canceled_before_submission"].assert_not_called()

    def test_cancel_requires_post(self):
        t = self.treatment(status=S.AWAITING_VISIT_COMPLETION)
        self.assertEqual(self.client.get(f"{B}{t.pk}/cancel/").status_code, 405)

    def test_unknown_id_is_404(self):
        self.assertEqual(self.client.get(f"{B}{uuid.uuid4()}/").status_code, 404)


class DoseLogApiTests(ApiBase):
    def setUp(self):
        super().setUp()
        self.t = self.treatment()
        self.t_b = self.treatment(self.b)

    def test_create_taken_dose_defaults(self):
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "taken", "strength_mg": "2.5", "pain_0_5": 2, "notes": "ok"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        log = DoseLog.objects.get(pk=r.json()["id"])
        self.assertEqual((log.entered_by, log.status, log.pain_0_5, log.notes), ("patient", "taken", 2, "ok"))
        self.assertIsNotNone(log.taken_at)
        self.assertFalse(log.auto_generated)

    def test_backfill_past_dose(self):
        past = (timezone.now() - timedelta(days=9)).isoformat()
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "taken", "taken_at": past}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertLess(DoseLog.objects.get(pk=r.json()["id"]).scheduled_at, timezone.now() - timedelta(days=8))

    def test_backfill_overdue_scheduled_dose_via_patch(self):
        overdue = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now() - timedelta(days=3), auto_generated=True)
        listed = self.client.get(B + "dose-logs/?overdue=1").json()["results"]
        self.assertEqual([x["id"] for x in listed], [str(overdue.pk)])
        self.assertTrue(listed[0]["is_overdue"])
        r = self.client.patch(f"{B}dose-logs/{overdue.pk}/", {"status": "taken", "taken_at": (timezone.now() - timedelta(days=3)).isoformat()}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        overdue.refresh_from_db()
        self.assertEqual(overdue.status, "taken")
        self.assertEqual(self.client.get(B + "dose-logs/?overdue=1").json()["results"], [])

    def test_future_taken_rejected(self):
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "taken", "taken_at": (timezone.now() + timedelta(days=1)).isoformat()}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_scheduled_with_taken_at_rejected(self):
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "scheduled", "taken_at": timezone.now().isoformat()}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_field_validation(self):
        bad = [{"pain_0_5": 6}, {"pain_0_5": -1}, {"strength_mg": "0"}, {"strength_mg": "-1"}, {"notes": "x" * 2001}, {"injection_site": "x" * 51}, {"status": "bogus"}]
        for extra in bad:
            with self.subTest(extra=list(extra)):
                payload = {"treatment": str(self.t.pk), "status": "skipped", **extra}
                self.assertEqual(self.client.post(B + "dose-logs/", payload, format="json").status_code, 400)

    def test_hostile_strings_are_stored_inertly(self):
        payload = {"treatment": str(self.t.pk), "status": "skipped", "notes": "<script>alert(1)</script>'; DROP TABLE x;--", "injection_site": "../../etc/passwd"}
        r = self.client.post(B + "dose-logs/", payload, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(DoseLog.objects.get(pk=r.json()["id"]).notes, payload["notes"])

    def test_cannot_log_against_other_patients_treatment(self):
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t_b.pk), "status": "skipped"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(DoseLog.objects.count(), 0)

    def test_cannot_log_against_pending_treatment(self):
        pending = self.treatment(status=S.PENDING_VISIT)
        r = self.client.post(B + "dose-logs/", {"treatment": str(pending.pk), "status": "skipped"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_patient_a_cannot_read_edit_or_delete_patient_b_dose_logs(self):
        theirs = DoseLog.objects.create(treatment=self.t_b, scheduled_at=timezone.now())
        mine = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now())
        self.assertEqual([x["id"] for x in self.client.get(B + "dose-logs/").json()["results"]], [str(mine.pk)])
        self.assertEqual(self.client.get(f"{B}dose-logs/{theirs.pk}/").status_code, 404)
        self.assertEqual(self.client.patch(f"{B}dose-logs/{theirs.pk}/", {"status": "skipped"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(f"{B}dose-logs/{theirs.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"{B}dose-logs/?treatment={self.t_b.pk}").json()["results"], [])
        theirs.refresh_from_db()
        self.assertEqual(theirs.status, "scheduled")

    def test_treatment_filter_with_garbage_is_empty_not_error(self):
        self.assertEqual(self.client.get(B + "dose-logs/?treatment=not-a-uuid").json()["results"], [])

    def test_treatment_cannot_be_changed_on_edit(self):
        log = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now())
        self.client.patch(f"{B}dose-logs/{log.pk}/", {"treatment": str(self.t_b.pk), "status": "skipped"}, format="json")
        log.refresh_from_db()
        self.assertEqual(log.treatment, self.t)

    def test_readonly_fields_ignored(self):
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "skipped", "entered_by": "staff", "auto_generated": True, "dose_number": 99}, format="json")
        log = DoseLog.objects.get(pk=r.json()["id"])
        self.assertEqual((log.entered_by, log.auto_generated, log.dose_number), ("patient", False, None))

    def test_staff_entries_cannot_be_edited_or_deleted_by_patient(self):
        log = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now(), entered_by="staff")
        self.assertEqual(self.client.patch(f"{B}dose-logs/{log.pk}/", {"status": "skipped"}, format="json").status_code, 400)
        self.assertEqual(self.client.delete(f"{B}dose-logs/{log.pk}/").status_code, 403)

    def test_delete_own_manual_entry_but_not_scheduled_dose(self):
        manual = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now())
        generated = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now(), auto_generated=True)
        self.assertEqual(self.client.delete(f"{B}dose-logs/{manual.pk}/").status_code, 204)
        self.assertEqual(self.client.delete(f"{B}dose-logs/{generated.pk}/").status_code, 403)
        self.assertTrue(DoseLog.objects.filter(pk=generated.pk).exists())

    def test_put_not_allowed(self):
        log = DoseLog.objects.create(treatment=self.t, scheduled_at=timezone.now())
        self.assertEqual(self.client.put(f"{B}dose-logs/{log.pk}/", {}, format="json").status_code, 405)

    def test_writes_are_audited(self):
        self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "skipped"}, format="json")
        self.assertTrue(AuditEvent.objects.filter(action="create", object_type="clinical.doselog").exists())

    def test_notes_are_encrypted_at_rest(self):
        r = self.client.post(B + "dose-logs/", {"treatment": str(self.t.pk), "status": "skipped", "notes": "secret note"}, format="json")
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("select notes from clinical_doselog where id = %s", [uuid.UUID(r.json()["id"]).hex])
            raw = cursor.fetchone()[0]
        self.assertNotIn("secret note", raw)


class HealthMetricApiTests(ApiBase):
    def post(self, **extra):
        payload = {"kind": "weight", "on_date": timezone.localdate().isoformat(), "value": "200.5", **extra}
        return self.client.post(B + "health-metrics/", payload, format="json")

    def test_create_sets_unit_and_patient(self):
        r = self.post()
        self.assertEqual(r.status_code, 201, r.content)
        m = HealthMetric.objects.get()
        self.assertEqual((m.patient, m.unit, m.value), (self.a, "lbs", Decimal("200.50")))

    def test_units_per_kind(self):
        for kind, value, unit in (("calories", "1800", "kcal"), ("exercise", "30", "minutes"), ("side_effect", "3", "severity_0_5")):
            with self.subTest(kind=kind):
                self.assertEqual(self.post(kind=kind, value=value).json()["unit"], unit)

    def test_value_bounds(self):
        for kind, value in (("weight", "10"), ("weight", "5000"), ("calories", "-1"), ("exercise", "2000"), ("side_effect", "6")):
            with self.subTest(kind=kind, value=value):
                self.assertEqual(self.post(kind=kind, value=value).status_code, 400)

    def test_rejects_bad_kind_date_and_value(self):
        self.assertEqual(self.post(kind="mood").status_code, 400)
        self.assertEqual(self.post(on_date=(timezone.localdate() + timedelta(days=30)).isoformat()).status_code, 400)
        self.assertEqual(self.post(value="abc").status_code, 400)
        self.assertEqual(self.post(notes="x" * 2001).status_code, 400)

    def test_cannot_set_patient(self):
        self.post(patient=str(self.b.pk))
        self.assertEqual(HealthMetric.objects.get().patient, self.a)

    def test_isolation(self):
        mine = HealthMetric.objects.create(patient=self.a, kind="weight", on_date=timezone.localdate(), value=Decimal("200"))
        theirs = HealthMetric.objects.create(patient=self.b, kind="weight", on_date=timezone.localdate(), value=Decimal("180"))
        self.assertEqual([x["id"] for x in self.client.get(B + "health-metrics/").json()["results"]], [str(mine.pk)])
        self.assertEqual(self.client.get(f"{B}health-metrics/{theirs.pk}/").status_code, 404)
        self.assertEqual(self.client.patch(f"{B}health-metrics/{theirs.pk}/", {"value": "1"}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(f"{B}health-metrics/{theirs.pk}/").status_code, 404)
        self.assertTrue(HealthMetric.objects.filter(pk=theirs.pk).exists())

    def test_update_revalidates_against_kind(self):
        m = HealthMetric.objects.create(patient=self.a, kind="weight", on_date=timezone.localdate(), value=Decimal("200"))
        self.assertEqual(self.client.patch(f"{B}health-metrics/{m.pk}/", {"value": "5"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(f"{B}health-metrics/{m.pk}/", {"value": "190"}, format="json").status_code, 200)
        self.assertEqual(self.client.delete(f"{B}health-metrics/{m.pk}/").status_code, 204)

    def test_filter_by_kind(self):
        self.post()
        self.post(kind="calories", value="2000")
        self.assertEqual(len(self.client.get(B + "health-metrics/?kind=calories").json()["results"]), 1)


class ActionItemAndHomeTests(ApiBase):
    def test_action_items_scoped_and_open_only_by_default(self):
        t = self.treatment(status=S.PENDING_VISIT)
        mine = ActionItem.objects.create(patient=self.a, treatment=t, kind="book_visit", title="Book")
        ActionItem.objects.create(patient=self.a, kind="upload_id", title="Done", is_open=False)
        ActionItem.objects.create(patient=self.b, kind="upload_id", title="Theirs")
        self.assertEqual([x["id"] for x in self.client.get(B + "action-items/").json()["results"]], [str(mine.pk)])
        self.assertEqual(len(self.client.get(B + "action-items/?all=1").json()["results"]), 2)

    def test_action_items_are_read_only(self):
        self.assertEqual(self.client.post(B + "action-items/", {}, format="json").status_code, 405)

    def test_home_summary(self):
        t = self.treatment(status=S.ACTIVE)
        pending = self.treatment(status=S.AWAITING_VISIT_COMPLETION)
        ActionItem.objects.create(patient=self.a, treatment=pending, kind="complete_visit", title="Finish")
        nxt = timezone.now() + timedelta(days=3)
        DoseLog.objects.create(treatment=t, scheduled_at=nxt)
        DoseLog.objects.create(treatment=t, scheduled_at=timezone.now() - timedelta(days=1))
        make_visit(t, scheduled_at=timezone.now() + timedelta(days=5))
        HealthMetric.objects.create(patient=self.a, kind="weight", on_date=timezone.localdate() - timedelta(days=7), value=Decimal("210"))
        HealthMetric.objects.create(patient=self.a, kind="weight", on_date=timezone.localdate(), value=Decimal("205"))
        data = self.client.get(B + "home/").json()
        kinds = [q["kind"] for q in data["quick_actions"]]
        self.assertIn("complete_visit", kinds)
        self.assertIn("log_dose", kinds)
        self.assertEqual(data["upcoming"]["overdue_doses"], 1)
        self.assertIsNotNone(data["upcoming"]["next_dose_at"])
        self.assertIsNotNone(data["upcoming"]["next_visit_at"])
        self.assertEqual({x["id"] for x in data["treatments"]}, {str(t.pk), str(pending.pk)})
        self.assertEqual(data["health_records"]["latest_weight_lbs"], "205.00")
        self.assertEqual(data["health_records"]["weight_change_lbs"], "-5.00")
        self.assertEqual(len(data["action_items"]), 1)

    def test_home_is_empty_for_new_patient_and_isolated(self):
        self.treatment(self.b)
        HealthMetric.objects.create(patient=self.b, kind="weight", on_date=timezone.localdate(), value=Decimal("180"))
        data = self.client.get(B + "home/").json()
        self.assertEqual(data["treatments"], [])
        self.assertEqual(data["quick_actions"], [])
        self.assertIsNone(data["health_records"]["latest_weight_lbs"])
        self.assertEqual(data["health_records"]["metric_count"], 0)

    def test_refill_due_quick_action(self):
        self.treatment(status=S.REFILL_DUE)
        kinds = [q["kind"] for q in self.client.get(B + "home/").json()["quick_actions"]]
        self.assertIn("request_refill", kinds)


class ExportTests(ApiBase):
    def test_clinical_section_registered_and_scoped(self):
        t = self.treatment()
        DoseLog.objects.create(treatment=t, scheduled_at=timezone.now())
        HealthMetric.objects.create(patient=self.a, kind="weight", on_date=timezone.localdate(), value=Decimal("200"))
        self.treatment(self.b)
        data = patient_export.build_export(self.a)
        self.assertNotIn("export_errors", data)
        self.assertEqual([r["id"] for r in data["treatments"]], [str(t.pk)])
        self.assertEqual(len(data["dose_logs"]), 1)
        self.assertEqual(len(data["health_metrics"]), 1)


class TreatmentCadenceFieldTests(ApiBase):
    def test_list_detail_home_expose_cadence_fields(self):
        v2 = make_variant(self.product, "5.00")
        from .helpers import make_phase

        make_phase(self.plan, 1, 0, self.variant, interval=7)
        make_phase(self.plan, 2, 1, v2, interval=14)
        t = self.treatment(status=S.ACTIVE, started_at=timezone.now() - timedelta(days=45))
        soon = timezone.now() + timedelta(days=2)
        DoseLog.objects.create(treatment=t, scheduled_at=soon + timedelta(days=7))
        DoseLog.objects.create(treatment=t, scheduled_at=soon)
        DoseLog.objects.create(treatment=t, scheduled_at=soon - timedelta(days=30), status="taken", taken_at=soon - timedelta(days=30))
        row = self.client.get(B).json()["results"][0]
        detail = self.client.get(f"{B}{t.pk}/").json()
        home = self.client.get(B + "home/").json()["treatments"][0]
        for data in (row, detail, home):
            self.assertEqual(data["dose_interval_days"], 14)
            self.assertEqual(data["term_months"], 1)
            self.assertEqual(data["ship_interval_months"], 1)
            self.assertEqual(data["plan_name"], self.plan.name)
            self.assertEqual(data["product_neutral_label"], "Beema Health membership")
            self.assertEqual(data["next_dose_at"], row["next_dose_at"])
            for hidden in ("network", "pharmacy", "submission", "patient", "submitted_to_network_at"):
                self.assertNotIn(hidden, data)
        self.assertIsNotNone(row["next_dose_at"])

    def test_unknown_cadence_is_null(self):
        t = make_treatment(self.a, S.PENDING_VISIT, product=self.product)
        data = self.client.get(f"{B}{t.pk}/").json()
        self.assertIsNone(data["dose_interval_days"])
        self.assertIsNone(data["term_months"])
        self.assertIsNone(data["next_dose_at"])
        self.assertEqual(data["plan_name"], "")

    def test_plan_without_phases_is_null(self):
        t = self.treatment()
        self.assertIsNone(self.client.get(f"{B}{t.pk}/").json()["dose_interval_days"])
