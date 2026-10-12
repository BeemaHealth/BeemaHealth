import uuid
from datetime import date
from unittest import mock

from django.db import connection
from django.test import TestCase

from apps.patients.models import ConsentRecord
from apps.questionnaires import engine, services
from apps.questionnaires.models import Questionnaire, Submission, SubmissionFile, hash_token
from apps.questionnaires.services import ServiceError

from .flow import BASE, BASICS, TODAY, current_user, everywhere
from .support import drive, make_patient, make_plans, patched_storage, publish_weight_loss

S = Submission.Status


def answer(sub, node_id, value, **kw):
    kw.setdefault("availability", everywhere)
    kw.setdefault("today", TODAY)
    return services.answer(sub, node_id, value, **kw)


class ServiceTestCase(TestCase):
    def setUp(self):
        self.version = publish_weight_loss()
        self.plans = make_plans()
        self.patient = make_patient()
        self.sub, self.token = services.start("weight_loss", utm={"utm_source": "google", "evil": "x"})


class StartTests(ServiceTestCase):
    def test_start_pins_latest_published_version(self):
        self.assertEqual(self.sub.version, self.version)
        self.assertEqual(self.sub.current_node, "motivation")
        self.assertEqual(self.sub.status, S.IN_PROGRESS)
        self.assertIsNone(self.sub.patient)

    def test_token_is_stored_hashed(self):
        self.assertEqual(self.sub.anonymous_token, hash_token(self.token))
        self.assertNotEqual(self.sub.anonymous_token, self.token)

    def test_utm_is_filtered(self):
        self.assertEqual(self.sub.utm, {"utm_source": "google"})
        sub, _ = services.start("weight_loss", utm={"utm_source": "x" * 500, "ref": {"a": 1}})
        self.assertEqual(len(sub.utm["utm_source"]), 100)
        self.assertNotIn("ref", sub.utm)

    def test_unknown_inactive_or_unpublished(self):
        for slug in ("nope",):
            with self.assertRaises(ServiceError) as ctx:
                services.start(slug)
            self.assertEqual(ctx.exception.status, 404)
        Questionnaire.objects.update(is_active=False)
        with self.assertRaises(ServiceError):
            services.start("weight_loss")

    def test_resolve_by_token(self):
        self.assertEqual(services.resolve_by_token(self.token), self.sub)
        self.assertIsNone(services.resolve_by_token("wrong"))
        self.assertIsNone(services.resolve_by_token(""))
        self.assertIsNone(services.resolve_by_token(None))


class AnswerTests(ServiceTestCase):
    def test_answer_advances_and_records_path(self):
        sub = answer(self.sub, "motivation", "health")
        self.assertEqual(sub.current_node, "weight_goal")
        self.assertEqual(sub.path, ["motivation"])
        self.assertEqual(sub.answers["motivation"], "health")
        self.assertEqual(sub.outcome["pending_node"], "weight_goal")

    def test_client_cannot_skip_or_replay_nodes(self):
        for node_id in ("weight_goal", "checkout", "thank_you", "motivation_x"):
            with self.assertRaises(ServiceError) as ctx:
                answer(self.sub, node_id, "lose_10_20")
            self.assertEqual((ctx.exception.code, ctx.exception.status), ("node_mismatch", 409))
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.current_node, "motivation")
        self.assertEqual(self.sub.answers, {})

    def test_cannot_answer_a_node_twice(self):
        answer(self.sub, "motivation", "health")
        with self.assertRaises(ServiceError):
            answer(self.sub, "motivation", "energy")

    def test_invalid_answer_changes_nothing(self):
        with self.assertRaises(engine.AnswerError):
            answer(self.sub, "motivation", "bogus")
        self.sub.refresh_from_db()
        self.assertEqual((self.sub.current_node, self.sub.answers, self.sub.path), ("motivation", {}, []))

    def test_error_messages_do_not_echo_input(self):
        secret = "SECRET-VALUE-123"
        with self.assertRaises(engine.AnswerError) as ctx:
            answer(self.sub, "motivation", secret)
        self.assertNotIn(secret, ctx.exception.message)

    def test_answers_are_encrypted_at_rest(self):
        answer(self.sub, "motivation", "doctor")
        with connection.cursor() as cursor:
            cursor.execute("SELECT answers FROM questionnaires_submission")
            raw = cursor.fetchone()[0]
        self.assertTrue(raw.startswith("enc1:"))
        self.assertNotIn("doctor", raw)

    def test_auth_node_cannot_be_answered(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="auth")
        with self.assertRaises(ServiceError) as ctx:
            answer(sub, "auth", None)
        self.assertEqual(ctx.exception.code, "account_required")

    def test_unclaimed_submission_cannot_get_past_auth(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="auth")
        with self.assertRaises(ServiceError):
            answer(sub, "basics", BASICS)
        sub.refresh_from_db()
        self.assertEqual(sub.current_node, "auth")

    def test_closed_submission_refuses_answers(self):
        sub = drive(self.sub, self.token, self.patient, {"basics": {**BASICS, "dob": "2012-01-01"}})
        self.assertEqual(sub.status, S.DISQUALIFIED)
        with self.assertRaises(ServiceError) as ctx:
            answer(sub, "no_proceed_age", {})
        self.assertEqual(ctx.exception.code, "submission_closed")

    def test_last_activity_updates(self):
        before = self.sub.last_activity_at
        sub = answer(self.sub, "motivation", "health")
        self.assertGreater(sub.last_activity_at, before)


class FullFlowTests(ServiceTestCase):
    def test_new_user_flow_submits(self):
        sub = drive(self.sub, self.token, self.patient)
        self.assertEqual(sub.status, S.SUBMITTED)
        self.assertEqual(sub.current_node, "thank_you")
        self.assertIsNotNone(sub.submitted_at)
        self.assertEqual(sub.patient, self.patient)
        self.assertTrue(sub.outcome["completed"])
        self.assertEqual(sub.selected_plan, self.plans["semaglutide-monthly"])
        self.assertEqual(sub.outcome["selected_variant_key"], "semaglutide.b12.titration")
        self.assertNotIn("zip_router", sub.path[:3])
        self.assertIn("phase_router", sub.answers)

    def test_current_user_flow_submits_with_proof_file(self):
        sub = drive(self.sub, self.token, self.patient, current_user())
        self.assertEqual(sub.status, S.SUBMITTED)
        self.assertEqual(sub.outcome["selected_variant_key"], "semaglutide.b12.maintenance")
        self.assertEqual(sub.files.filter(kind="glp1_proof").count(), 1)
        self.assertEqual(sub.files.filter(kind="id_photo").count(), 1)

    def test_checkout_does_not_advance_until_payment(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout")
        sub = answer(sub, "checkout", {"plan_slug": "semaglutide-3month"})
        self.assertEqual(sub.current_node, "checkout")
        self.assertEqual(sub.selected_plan, self.plans["semaglutide-3month"])
        with self.assertRaises(ServiceError):
            answer(sub, "medical_intro", None)
        sub = services.complete_checkout(sub, availability=everywhere)
        self.assertEqual(sub.current_node, "medical_intro")
        self.assertIn("checkout", sub.path)

    def test_complete_checkout_requires_a_chosen_plan_and_checkout_node(self):
        with self.assertRaises(ServiceError):
            services.complete_checkout(self.sub)
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout")
        with self.assertRaises(ServiceError):
            services.complete_checkout(sub)

    def test_checkout_rejects_plans_not_offered(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout")
        for plan in ("tirzepatide-monthly", "semaglutide-starter-pack", "nope"):
            with self.assertRaises(engine.AnswerError):
                answer(sub, "checkout", {"plan_slug": plan})

    def test_checkout_with_inactive_plan(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout")
        self.plans["semaglutide-monthly"].is_active = False
        self.plans["semaglutide-monthly"].save()
        with self.assertRaises(ServiceError) as ctx:
            answer(sub, "checkout", {"plan_slug": "semaglutide-monthly"})
        self.assertEqual(ctx.exception.code, "plan_unavailable")

    def test_demographics_sync_to_profile(self):
        drive(self.sub, self.token, self.patient)
        self.patient.refresh_from_db()
        self.patient.user.refresh_from_db()
        self.assertEqual(self.patient.date_of_birth, date(1985, 4, 12))
        self.assertEqual(self.patient.sex_at_birth, "male")
        self.assertEqual(float(self.patient.height_inches), 66.0)
        self.assertEqual(float(self.patient.starting_weight_lbs), 220.0)
        self.assertEqual(self.patient.user.phone, "+17135550123")

    def test_consents_are_recorded_with_request_meta(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="bmi_consent")
        answer(sub, "bmi_consent", True, meta={"ip": "203.0.113.5", "user_agent": "UA"})
        record = ConsentRecord.objects.get(patient=self.patient)
        self.assertEqual((record.kind, record.version, record.ip), ("weight_loss", "v2", "203.0.113.5"))
        self.assertEqual(len(record.user_agent_hash), 64)

    def test_all_flow_consents_recorded_for_full_flow(self):
        drive(self.sub, self.token, self.patient)
        kinds = set(ConsentRecord.objects.filter(patient=self.patient).values_list("kind", flat=True))
        self.assertTrue({"weight_loss", "glp1", "truthfulness"} <= kinds)

    def test_disqualification_closes_submission(self):
        sub = drive(self.sub, self.token, self.patient, {"bmi_new": {"height_feet": 5, "height_inches": 6, "weight_lbs": 140}})
        self.assertEqual(sub.status, S.DISQUALIFIED)
        self.assertEqual(sub.current_node, "no_proceed_bmi")
        self.assertEqual(sub.outcome["disqualify_reason"], "bmi_below_minimum")
        self.assertIsNone(sub.submitted_at)
        with self.assertRaises(ServiceError):
            answer(sub, "bmi_consent", True)

    def test_state_unavailable_collects_waitlist_email(self):
        sub = drive(self.sub, self.token, self.patient, availability=lambda s, d: False)
        self.assertEqual(sub.current_node, "no_proceed_state")
        self.assertEqual(sub.outcome["disqualify_reason"], "state_unavailable")
        self.assertEqual(sub.answers["zip_router"], {"available": False})
        sub = answer(sub, "no_proceed_state", {"email": "Wait@List.com"})
        self.assertEqual(sub.answers["no_proceed_state"], {"email": "wait@list.com"})
        self.assertEqual(sub.status, S.DISQUALIFIED)
        with self.assertRaises(engine.AnswerError):
            answer(sub, "no_proceed_state", {"email": "not-an-email"})

    def test_age_boundary_uses_injected_today(self):
        self.assertEqual(drive(self.sub, self.token, self.patient, {"basics": {**BASICS, "dob": "2008-10-07"}}).status, S.DISQUALIFIED)
        sub2, token2 = services.start("weight_loss")
        self.assertEqual(drive(sub2, token2, make_patient("b@example.com"), {"basics": {**BASICS, "dob": "2008-10-06"}}).status, S.SUBMITTED)


class BackTests(ServiceTestCase):
    def test_back_removes_answer_and_returns(self):
        sub = answer(self.sub, "motivation", "health")
        sub = services.back(sub)
        self.assertEqual((sub.current_node, sub.path, sub.answers), ("motivation", [], {}))

    def test_back_at_start_is_refused(self):
        with self.assertRaises(ServiceError):
            services.back(self.sub)

    def test_back_from_disqualification_before_checkout_reopens(self):
        sub = drive(self.sub, self.token, self.patient, {"bmi_new": {"height_feet": 5, "height_inches": 6, "weight_lbs": 140}})
        sub = services.back(sub)
        self.assertEqual((sub.status, sub.current_node), (S.IN_PROGRESS, "bmi_new"))
        self.assertNotIn("bmi_new", sub.answers)
        sub = answer(sub, "bmi_new", {"height_feet": 5, "height_inches": 6, "weight_lbs": 220})
        self.assertEqual(sub.current_node, "bmi_consent")

    def test_back_skips_auto_nodes_and_drops_their_answers(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="additive_semaglutide")
        self.assertIn("zip_router", sub.answers)
        sub = services.back(sub)
        self.assertEqual(sub.current_node, "drug_choice")
        self.assertNotIn("zip_router", sub.answers)
        self.assertNotIn("drug_choice", sub.answers)

    def test_cannot_go_back_across_account_gate_once_claimed(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="basics")
        with self.assertRaises(ServiceError):
            services.back(sub)

    def test_cannot_go_back_into_checkout_after_payment(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="conditions")
        sub = services.back(sub)
        self.assertEqual(sub.current_node, "medical_intro")
        with self.assertRaises(ServiceError):
            services.back(sub)

    def test_back_from_checkout_clears_plan_choice(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout")
        sub = answer(sub, "checkout", {"plan_slug": "semaglutide-monthly"})
        sub = services.back(sub)
        self.assertEqual(sub.current_node, "telehealth_consent")
        self.assertIsNone(sub.selected_plan)
        self.assertNotIn("checkout", sub.answers)

    def test_cannot_dodge_post_payment_disqualification_by_going_back(self):
        sub = drive(self.sub, self.token, self.patient, {"gastric_bypass": "yes"})
        self.assertEqual(sub.status, S.DISQUALIFIED)
        with self.assertRaises(ServiceError):
            services.back(sub)

    def test_submitted_cannot_go_back(self):
        sub = drive(self.sub, self.token, self.patient)
        with self.assertRaises(ServiceError):
            services.back(sub)


class ClaimTests(ServiceTestCase):
    def test_claim_attaches_patient_and_advances_past_auth(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="auth")
        claimed = services.claim(sub, self.patient, self.token)
        self.assertEqual(claimed.patient, self.patient)
        self.assertEqual(claimed.current_node, "basics")
        self.assertEqual(claimed.anonymous_token, "")
        self.assertIsNotNone(claimed.account_created_at)
        self.assertIn("auth", claimed.path)

    def test_claim_before_auth_node_only_attaches(self):
        claimed = services.claim(self.sub, self.patient, self.token)
        self.assertEqual((claimed.patient, claimed.current_node), (self.patient, "motivation"))

    def test_cannot_claim_twice(self):
        services.claim(self.sub, self.patient, self.token)
        for who, token in ((self.patient, self.token), (make_patient("other@example.com"), self.token)):
            with self.assertRaises(ServiceError) as ctx:
                services.claim(self.sub, who, token)
            self.assertEqual((ctx.exception.code, ctx.exception.status), ("already_claimed", 409))
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.patient, self.patient)

    def test_cannot_claim_with_wrong_or_missing_token(self):
        other = make_patient("other@example.com")
        for token in (None, "", "guess", new_token_like()):
            with self.assertRaises(ServiceError) as ctx:
                services.claim(self.sub, other, token)
            self.assertEqual(ctx.exception.code, "invalid_token")
        self.sub.refresh_from_db()
        self.assertIsNone(self.sub.patient)

    def test_token_of_another_submission_does_not_work(self):
        _, other_token = services.start("weight_loss")
        with self.assertRaises(ServiceError):
            services.claim(self.sub, self.patient, other_token)

    def test_claimed_submission_is_not_reachable_by_old_token(self):
        services.claim(self.sub, self.patient, self.token)
        self.assertIsNone(services.resolve_by_token(self.token))


def new_token_like():
    return "x" * 43


class PatientAccessTests(ServiceTestCase):
    def test_get_submission_for_patient_is_scoped(self):
        services.claim(self.sub, self.patient, self.token)
        other = make_patient("other@example.com")
        self.assertEqual(services.get_submission_for_patient(self.patient, self.sub.id), self.sub)
        with self.assertRaises(Submission.DoesNotExist):
            services.get_submission_for_patient(other, self.sub.id)
        self.assertIsNone(services.get_submission_for_patient(other))
        with self.assertRaises(Submission.DoesNotExist):
            services.get_submission_for_patient(self.patient, uuid.uuid4())

    def test_latest_and_in_progress_filter(self):
        services.claim(self.sub, self.patient, self.token)
        done, token = services.start("weight_loss")
        done = drive(done, token, self.patient)
        self.assertEqual(services.get_submission_for_patient(self.patient).pk, done.pk)
        self.assertEqual(services.get_submission_for_patient(self.patient, open_only=True).pk, self.sub.pk)


class DescribeTests(ServiceTestCase):
    def test_describe_exposes_only_current_node_and_own_previous_answer(self):
        sub = answer(self.sub, "motivation", "health")
        data = services.describe(sub)
        self.assertEqual(data["node"]["id"], "weight_goal")
        self.assertEqual(data["path"], ["motivation"])
        self.assertIsNone(data["previous_answer"])
        self.assertNotIn("answers", data)
        self.assertNotIn("routes", data["node"])
        self.assertFalse(data["claimed"])
        self.assertIn("shell", data["layout"])

    def test_previous_answer_shown_after_back(self):
        sub = answer(self.sub, "motivation", "health")
        sub = services.back(sub)
        self.assertIsNone(services.describe(sub)["previous_answer"])

    def test_checkout_description_lists_plans_without_internals(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout")
        node = services.describe(sub)["node"]
        self.assertEqual(node["plan_slugs"][0], "semaglutide-monthly")
        self.assertNotIn("variants", node)

    def test_no_proceed_exposes_reason(self):
        sub = drive(self.sub, self.token, self.patient, {"gastric_bypass": "yes"})
        data = services.describe(sub)
        self.assertEqual(data["disqualify_reason"], "recent_gastric_bypass")
        self.assertNotIn("reason", data["node"])

    def test_layout_overrides_merge(self):
        self.version.layout.config  # loaded
        merged = services._merge({"a": {"b": 1, "c": 2}, "d": 1}, {"a": {"b": 9}})
        self.assertEqual(merged, {"a": {"b": 9, "c": 2}, "d": 1})


class FileTests(ServiceTestCase):
    def setUp(self):
        super().setUp()
        self.sub = drive(self.sub, self.token, self.patient, current_user(), stop_at="glp1_proof")

    def make_file(self, sub=None, kind="glp1_proof"):
        sub = sub or self.sub
        return SubmissionFile.objects.create(submission=sub, kind=kind, s3_key=f"submissions/{sub.id}/{uuid.uuid4()}")

    def test_valid_upload_is_marked_uploaded(self):
        file = self.make_file()
        with patched_storage():
            sub = answer(self.sub, "glp1_proof", {"file_ids": [str(file.id)]})
        file.refresh_from_db()
        self.assertEqual((file.status, file.size_bytes), ("uploaded", 2048))
        self.assertEqual(sub.current_node, "id_verification")

    def test_other_submissions_file_is_rejected(self):
        other, _ = services.start("weight_loss")
        foreign = self.make_file(other)
        with patched_storage(), self.assertRaises(engine.AnswerError) as ctx:
            answer(self.sub, "glp1_proof", {"file_ids": [str(foreign.id)]})
        self.assertEqual(ctx.exception.code, "invalid_file")

    def test_unknown_file_id(self):
        with patched_storage(), self.assertRaises(engine.AnswerError):
            answer(self.sub, "glp1_proof", {"file_ids": [str(uuid.uuid4())]})

    def test_wrong_kind_is_rejected(self):
        file = self.make_file(kind="id_photo")
        with patched_storage(), self.assertRaises(engine.AnswerError):
            answer(self.sub, "glp1_proof", {"file_ids": [str(file.id)]})

    def test_file_not_in_storage_is_rejected(self):
        file = self.make_file()
        with mock.patch("apps.questionnaires.storage.object_size", return_value=None), self.assertRaises(engine.AnswerError) as ctx:
            answer(self.sub, "glp1_proof", {"file_ids": [str(file.id)]})
        self.assertEqual(ctx.exception.code, "upload_missing")

    def test_unconfigured_storage_is_a_503_not_a_crash(self):
        file = self.make_file()
        with self.settings(PHI_UPLOAD_BUCKET=""), self.assertRaises(ServiceError) as ctx:
            answer(self.sub, "glp1_proof", {"file_ids": [str(file.id)]})
        self.assertEqual(ctx.exception.status, 503)

    def test_rejected_file_cannot_be_used(self):
        file = self.make_file()
        file.status = "rejected"
        file.save()
        with patched_storage(), self.assertRaises(engine.AnswerError):
            answer(self.sub, "glp1_proof", {"file_ids": [str(file.id)]})

    def test_skip_allowed_only_when_no_photo(self):
        with self.assertRaises(engine.AnswerError):
            answer(self.sub, "glp1_proof", {"skipped": True})

    def test_create_upload(self):
        with patched_storage():
            file, presigned = services.create_upload(self.sub, "id_photo", "image/png", 1000)
        self.assertEqual(file.status, "pending")
        self.assertTrue(file.s3_key.startswith(f"submissions/{self.sub.id}/"))
        self.assertIn("url", presigned)

    def test_create_upload_validation(self):
        bad = (("passport", "image/png", 10), ("id_photo", "text/html", 10), ("id_photo", "image/png", 0),
               ("id_photo", "image/png", 11 * 1024 * 1024), ("id_photo", "image/png", "10"), ("id_photo", "image/png", True),
               ("id_photo", "application/x-sh", 10))
        with patched_storage():
            for kind, ctype, size in bad:
                with self.assertRaises(ServiceError, msg=f"{kind} {ctype} {size}"):
                    services.create_upload(self.sub, kind, ctype, size)

    def test_create_upload_caps_files_per_submission(self):
        with patched_storage():
            for _ in range(10):
                services.create_upload(self.sub, "other", "image/png", 10)
            with self.assertRaises(ServiceError) as ctx:
                services.create_upload(self.sub, "other", "image/png", 10)
        self.assertEqual(ctx.exception.status, 429)

    def test_create_upload_without_bucket(self):
        from apps.questionnaires import storage

        with self.settings(PHI_UPLOAD_BUCKET=""), self.assertRaises(ServiceError) as ctx:
            services.create_upload(self.sub, "id_photo", "image/png", 10)
        self.assertEqual(ctx.exception.status, 503)
        self.assertEqual(self.sub.files.count(), 0)
        with self.settings(PHI_UPLOAD_BUCKET=""), self.assertRaises(storage.StorageNotConfigured):
            storage.presign_upload("k", "image/png")


class VisitPayloadTests(ServiceTestCase):
    def test_requires_completed_submission(self):
        with self.assertRaises(ServiceError) as ctx:
            services.build_visit_payload(self.sub)
        self.assertEqual(ctx.exception.code, "not_submitted")

    def test_payload_contents_for_new_user(self):
        sub = drive(self.sub, self.token, self.patient)
        payload = services.build_visit_payload(sub)
        self.assertEqual(payload["patient"]["first_name"], "Pat")
        self.assertEqual(payload["patient"]["email"], "pat@example.com")
        self.assertEqual(payload["patient"]["phone"], "+17135550123")
        self.assertEqual(payload["patient"]["dob"], "1985-04-12")
        self.assertEqual(payload["location"], {"state": "TX", "zip": "77002", "address_line1": "1 Main St",
                                                "address_line2": "Apt 4", "city": "Houston"})
        self.assertEqual((payload["patient"]["address"], payload["patient"]["city"]), ("1 Main St Apt 4", "Houston"))
        self.assertEqual({"terms", "privacy", "telehealth"} <= set(payload["consents"]), True)
        self.assertEqual(payload["body"], {"height_in": 66, "weight_lbs": 220.0, "bmi": 35.5})
        self.assertEqual(payload["treatment"], {"drug": "semaglutide", "additive": "b12", "phase": "titration",
                                                "variant_key": "semaglutide.b12.titration", "plan_slug": "semaglutide-monthly"})
        self.assertEqual(payload["intake"]["glp1"]["history"], "never")
        self.assertEqual(payload["intake"]["medical"]["gastric_bypass_6mo"], "no")
        self.assertEqual(payload["intake"]["medical"]["allergies"], {"none": True, "items": []})
        self.assertIn("glp1", payload["consents"])
        self.assertEqual(len(payload["files"]["id_photo"]), 1)
        self.assertNotIn("glp1_proof", payload["files"])

    def test_payload_for_current_user_includes_proof_and_dose(self):
        sub = drive(self.sub, self.token, self.patient, current_user())
        payload = services.build_visit_payload(sub)
        self.assertEqual(payload["intake"]["glp1"]["current_dose"], "sema_1_0mg")
        self.assertEqual(payload["treatment"]["phase"], "maintenance")
        self.assertEqual(len(payload["files"]["glp1_proof"]), 1)
        self.assertEqual(payload["body"]["bmi"], 24.2)

    def test_payload_has_no_blank_values_and_readable_questions(self):
        sub = drive(self.sub, self.token, self.patient)
        payload = services.build_visit_payload(sub)

        def walk(value):
            if isinstance(value, dict):
                for v in value.values():
                    self.assertNotIn(v, (None, ""))
                    walk(v)
            elif isinstance(value, list):
                for v in value:
                    walk(v)

        walk(payload)
        gastric = next(q for q in payload["questions"] if q["node"] == "gastric_bypass")
        self.assertEqual(gastric["answer"], "No")
        self.assertTrue(gastric["question"].startswith("Have you had gastric bypass"))

    def test_payload_includes_free_text_and_lists(self):
        overrides = {"conditions": ["gallbladder"], "conditions_detail": "Stones in 2019", "extra_notes": "Allergic to adhesive",
                     "add_medication": {"items": [{"name": "Metformin", "dose": "500 mg", "frequency": "daily"}]}}
        sub = drive(self.sub, self.token, self.patient, overrides)
        medical = services.build_visit_payload(sub)["intake"]["medical"]
        self.assertEqual(medical["conditions_detail"], "Stones in 2019")
        self.assertEqual(medical["extra_notes"], "Allergic to adhesive")
        self.assertEqual(medical["medications"]["items"][0]["name"], "Metformin")
        self.assertEqual(medical["conditions"], ["gallbladder"])
        self.assertIn("gallbladder", services.build_visit_payload(sub)["consents"])
        self.assertIn("gallbladder", services.build_visit_payload(sub)["flags"])

    def test_payload_is_json_serializable(self):
        import json

        sub = drive(self.sub, self.token, self.patient)
        json.dumps(services.build_visit_payload(sub))


class RoutingBridgeTests(TestCase):
    def test_missing_routing_app_counts_as_available(self):
        with mock.patch.dict("sys.modules", {"apps.routing.engine": None}):
            self.assertTrue(services.availability_via_routing("TX", "semaglutide"))

    def test_uses_routing_engine_per_variant(self):
        import sys
        import types

        from apps.catalog.models import Product, ProductVariant

        product = Product.objects.create(slug="p", name="P", category="weight_loss", neutral_label="x")
        for additive in ("b12", "glycine"):
            ProductVariant.objects.create(product=product, drug="semaglutide", additive=additive, phase="titration", slug=f"s-{additive}")
        fake = types.ModuleType("apps.routing.engine")
        fake.is_available = lambda state, variant: variant.additive == "glycine" and state == "TX"
        with mock.patch.dict(sys.modules, {"apps.routing.engine": fake}):
            self.assertTrue(services.availability_via_routing("TX", "semaglutide"))
            self.assertFalse(services.availability_via_routing("NY", "semaglutide"))
            self.assertFalse(services.availability_via_routing("TX", "tirzepatide"))


class NameAddressConsentTests(ServiceTestCase):
    def test_basics_copies_name_address_and_phone_to_account(self):
        from apps.patients.models import Address

        drive(self.sub, self.token, self.patient, stop_at="glp1_history")
        self.patient.user.refresh_from_db()
        self.assertEqual((self.patient.user.first_name, self.patient.user.last_name), ("Pat", "Tester"))
        address = Address.objects.get(patient=self.patient)
        self.assertEqual((address.kind, address.is_default, address.line1, address.line2), ("shipping", True, "1 Main St", "Apt 4"))
        self.assertEqual((address.city, address.state, address.zip_code), ("Houston", "TX", "77002"))

    def test_redoing_basics_updates_the_same_address(self):
        from apps.patients.models import Address

        sub = drive(self.sub, self.token, self.patient, stop_at="glp1_history")
        sub = services.back(sub)
        answer(sub, "basics", {**BASICS, "address_line1": "9 Oak Ave", "city": "Austin"})
        address = Address.objects.get(patient=self.patient)
        self.assertEqual((address.line1, address.city), ("9 Oak Ave", "Austin"))

    def test_terms_privacy_and_telehealth_consents_recorded(self):
        drive(self.sub, self.token, self.patient, stop_at="checkout")
        kinds = set(ConsentRecord.objects.filter(patient=self.patient).values_list("kind", flat=True))
        self.assertTrue({"terms", "privacy", "telehealth"} <= kinds)

    def test_name_and_address_are_required_and_validated(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="basics")
        for key in ("first_name", "last_name", "address_line1", "city"):
            bad = {k: v for k, v in BASICS.items() if k != key}
            with self.assertRaises(engine.AnswerError, msg=key):
                answer(sub, "basics", bad)
        for key, attack in (("first_name", "<script>"), ("last_name", "Robert'); DROP"), ("city", "../x"),
                            ("address_line1", "1 Main <b>"), ("first_name", "x" * 61), ("last_name", "R2D2")):
            with self.assertRaises(engine.AnswerError, msg=key):
                answer(sub, "basics", {**BASICS, key: attack})
        for good in ("Mary-Jane", "O'Brien", "Jose Maria", "St. John"):
            answer(sub, "basics", {**BASICS, "first_name": good})
            sub = services.back(sub)

    def test_cannot_reach_checkout_without_telehealth_consent(self):
        sub = drive(self.sub, self.token, self.patient, stop_at="telehealth_consent")
        with self.assertRaises(engine.AnswerError):
            answer(sub, "telehealth_consent", False)
        with self.assertRaises(ServiceError):
            answer(sub, "checkout", {"plan_slug": "semaglutide-monthly"})
