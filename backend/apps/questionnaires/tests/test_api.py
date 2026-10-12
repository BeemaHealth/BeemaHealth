import uuid
from unittest import mock

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.questionnaires.models import Submission
from apps.questionnaires.throttles import StartThrottle
from apps.questionnaires.views import COOKIE_NAME

from .flow import BASE, BASICS, FILE_ID
from .support import make_patient, make_plans, patched_storage, publish_weight_loss

BASE_URL = "/api/v1/questionnaires/"


class ApiTestCase(APITestCase):
    def setUp(self):
        cache.clear()
        publish_weight_loss()
        make_plans()
        patcher = mock.patch("apps.questionnaires.services.availability_via_routing", return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)
        self.client = APIClient()

    def post(self, path, data=None, client=None):
        return (client or self.client).post(BASE_URL + path, data or {}, format="json")

    def start(self, client=None):
        response = self.post("start/", {"questionnaire": "weight_loss"}, client)
        self.assertEqual(response.status_code, 201, response.content)
        return response

    def answer(self, node_id, value, client=None):
        return self.post("answer/", {"node_id": node_id, "value": value}, client)

    def run_until(self, stop_at, client=None):
        """Answer pre-account nodes with BASE answers until ``stop_at`` is current."""
        client = client or self.client
        data = client.get(BASE_URL + "current/").json()
        while data["node"]["id"] != stop_at:
            response = self.answer(data["node"]["id"], BASE[data["node"]["id"]], client)
            self.assertEqual(response.status_code, 200, response.content)
            data = response.json()
        return data


class StartTests(ApiTestCase):
    def test_start_sets_httponly_cookie_and_returns_first_node(self):
        response = self.start()
        data = response.json()
        self.assertEqual(data["node"]["id"], "motivation")
        self.assertEqual(data["progress"], 0.0)
        self.assertIn("layout", data)
        cookie = response.cookies[COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertTrue(cookie["secure"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["path"], BASE_URL)
        self.assertGreater(len(cookie.value), 30)
        self.assertNotIn(cookie.value, response.content.decode())

    def test_response_never_contains_routing_or_answers(self):
        body = self.start().content.decode()
        for forbidden in ('"routes"', '"answers"', "no_proceed_bmi", '"next"', "unavailable_goto"):
            self.assertNotIn(forbidden, body)

    def test_start_again_resumes_same_submission(self):
        first = self.start().json()
        second = self.post("start/", {"questionnaire": "weight_loss"})
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["submission_id"], first["submission_id"])
        self.assertEqual(Submission.objects.count(), 1)

    def test_invalid_bodies(self):
        for body in ({}, {"questionnaire": 5}, {"questionnaire": ""}, {"questionnaire": "x" * 81}, {"questionnaire": ["a"]}):
            self.assertEqual(self.post("start/", body).status_code, 400, body)
        self.assertEqual(self.client.post(BASE_URL + "start/", "[]", content_type="application/json").status_code, 400)

    def test_unknown_questionnaire(self):
        response = self.post("start/", {"questionnaire": "nope"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["error"]["code"], "not_found")

    def test_utm_stored_without_unknown_keys(self):
        response = self.post("start/", {"questionnaire": "weight_loss", "utm": {"utm_source": "g", "email": "a@b.com"}})
        self.assertEqual(Submission.objects.get(pk=response.json()["submission_id"]).utm, {"utm_source": "g"})

    def test_start_is_throttled(self):
        with mock.patch.object(StartThrottle, "rate", "2/hour"):
            self.assertEqual(self.post("start/", {"questionnaire": "weight_loss"}).status_code, 201)
            self.assertEqual(self.post("start/", {"questionnaire": "weight_loss"}, APIClient()).status_code, 201)
            self.assertEqual(self.post("start/", {"questionnaire": "weight_loss"}, APIClient()).status_code, 429)


class CurrentAndAnswerTests(ApiTestCase):
    def test_current_requires_a_valid_token(self):
        self.assertEqual(self.client.get(BASE_URL + "current/").status_code, 204)
        self.start()
        self.assertEqual(self.client.get(BASE_URL + "current/").json()["node"]["id"], "motivation")
        stranger = APIClient()
        stranger.cookies[COOKIE_NAME] = "not-a-real-token"
        self.assertEqual(stranger.get(BASE_URL + "current/").status_code, 204)

    def test_answer_advances_and_returns_next_node(self):
        self.start()
        data = self.answer("motivation", "health").json()
        self.assertEqual(data["node"]["id"], "weight_goal")
        self.assertEqual(data["path"], ["motivation"])
        self.assertGreater(data["progress"], 0)

    def test_client_cannot_skip_nodes(self):
        self.start()
        for node_id in ("weight_goal", "checkout", "thank_you"):
            response = self.answer(node_id, "x")
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.json()["error"]["code"], "node_mismatch")
        self.assertEqual(self.client.get(BASE_URL + "current/").json()["node"]["id"], "motivation")

    def test_invalid_value_is_400_and_not_echoed(self):
        self.start()
        for attack in ("<script>alert(1)</script>", "' OR 1=1;--", "../../etc/passwd", "x" * 50000):
            response = self.answer("motivation", attack)
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.json()["error"]["code"], "invalid_option")
            self.assertNotIn(attack[:20], response.content.decode())

    def test_malformed_requests(self):
        self.start()
        for body in ({}, {"node_id": "motivation"}, {"value": "health"}, {"node_id": 5, "value": "health"}):
            self.assertEqual(self.post("answer/", body).status_code, 400, body)
        self.assertEqual(self.client.post(BASE_URL + "answer/", "[]", content_type="application/json").status_code, 400)

    def test_answer_without_cookie(self):
        self.assertEqual(self.answer("motivation", "health").status_code, 404)

    def test_unclaimed_visitor_cannot_pass_account_gate(self):
        self.start()
        data = self.run_until("auth")
        self.assertEqual(data["node"]["type"], "auth")
        response = self.answer("auth", None)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "account_required")
        self.assertEqual(self.client.get(BASE_URL + "current/").json()["node"]["id"], "auth")

    def test_previous_answer_returned_only_for_current_node(self):
        self.start()
        self.answer("motivation", "doctor")
        data = self.post("back/").json()
        self.assertEqual(data["node"]["id"], "motivation")
        self.assertIsNone(data["previous_answer"])

    def test_back(self):
        self.start()
        self.assertEqual(self.post("back/").status_code, 409)
        self.answer("motivation", "health")
        self.assertEqual(self.post("back/").json()["node"]["id"], "motivation")
        self.assertEqual(APIClient().post(BASE_URL + "back/", {}, format="json").status_code, 404)


class IsolationTests(ApiTestCase):
    def test_anonymous_token_cannot_read_or_answer_other_submissions(self):
        a, b = APIClient(), APIClient()
        sub_a = self.start(a).json()["submission_id"]
        sub_b = self.start(b).json()["submission_id"]
        self.assertNotEqual(sub_a, sub_b)
        self.answer("motivation", "health", a)
        # B asking for A's id gets B's own submission, never A's.
        data = b.get(BASE_URL + "current/", {"submission_id": sub_a}).json()
        self.assertEqual(data["submission_id"], sub_b)
        self.assertEqual(data["path"], [])
        response = self.post("answer/", {"node_id": "weight_goal", "value": "lose_10_20", "submission_id": sub_a}, b)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Submission.objects.get(pk=sub_a).current_node, "weight_goal")
        self.assertEqual(Submission.objects.get(pk=sub_b).current_node, "motivation")

    def test_anonymous_cannot_use_submission_id_without_a_token(self):
        sub = self.start().json()["submission_id"]
        response = APIClient().get(BASE_URL + "current/", {"submission_id": sub})
        self.assertEqual(response.status_code, 204)

    def test_claimed_submission_needs_the_owning_patient(self):
        patient_a, patient_b = make_patient("a@example.com"), make_patient("b@example.com")
        a = APIClient()
        sub_id = self.start(a).json()["submission_id"]
        a.force_login(patient_a.user)
        self.assertEqual(self.post("claim/", client=a).status_code, 200)
        owner = APIClient()
        owner.force_login(patient_a.user)
        self.assertEqual(owner.get(BASE_URL + "current/").json()["submission_id"], sub_id)
        self.assertEqual(owner.get(BASE_URL + "current/", {"submission_id": sub_id}).status_code, 200)
        other = APIClient()
        other.force_login(patient_b.user)
        self.assertEqual(other.get(BASE_URL + "current/", {"submission_id": sub_id}).status_code, 204)
        self.assertEqual(other.get(BASE_URL + "current/").status_code, 204)
        self.assertEqual(self.post("answer/", {"node_id": "motivation", "value": "health", "submission_id": sub_id}, other).status_code, 404)
        self.assertEqual(other.get(BASE_URL + "current/", {"submission_id": "not-a-uuid"}).status_code, 204)
        self.assertEqual(other.get(BASE_URL + "current/", {"submission_id": str(uuid.uuid4())}).status_code, 204)

    def test_old_cookie_stops_working_after_claim(self):
        patient = make_patient()
        self.start()
        token = self.client.cookies[COOKIE_NAME].value
        self.client.force_login(patient.user)
        self.post("claim/")
        replay = APIClient()
        replay.cookies[COOKIE_NAME] = token
        self.assertEqual(replay.get(BASE_URL + "current/").status_code, 204)
        self.assertEqual(self.answer("motivation", "health", replay).status_code, 404)


class ClaimTests(ApiTestCase):
    def test_claim_requires_authentication(self):
        self.start()
        self.assertIn(self.post("claim/").status_code, (401, 403))
        self.assertIsNone(Submission.objects.get().patient)

    def test_claim_attaches_patient_and_clears_cookie(self):
        patient = make_patient()
        self.start()
        self.run_until("auth")
        self.client.force_login(patient.user)
        response = self.post("claim/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["node"]["id"], "basics")
        self.assertTrue(data["claimed"])
        self.assertEqual(response.cookies[COOKIE_NAME].value, "")
        self.assertEqual(Submission.objects.get().patient, patient)

    def test_claim_twice_fails(self):
        patient = make_patient()
        self.start()
        self.client.force_login(patient.user)
        self.assertEqual(self.post("claim/").status_code, 200)
        self.assertEqual(self.post("claim/").status_code, 404)

    def test_claim_without_cookie(self):
        patient = make_patient()
        self.client.force_login(patient.user)
        self.assertEqual(self.post("claim/").status_code, 404)

    def test_other_user_cannot_claim_without_the_token(self):
        victim = make_patient("victim@example.com")
        attacker = make_patient("attacker@example.com")
        self.start(APIClient())
        sub = Submission.objects.get()
        client = APIClient()
        client.force_login(attacker.user)
        self.assertEqual(self.post("claim/", client=client).status_code, 404)
        client.cookies[COOKIE_NAME] = "guess"
        self.assertEqual(self.post("claim/", client=client).status_code, 404)
        sub.refresh_from_db()
        self.assertIsNone(sub.patient)
        self.assertTrue(victim)

    def test_claim_needs_a_patient_profile(self):
        user = User.objects.create_user("noprofile@example.com", "S0me-long-passw0rd!")
        self.start()
        self.client.force_login(user)
        self.assertEqual(self.post("claim/").status_code, 403)

    def test_csrf_enforced_for_session_users(self):
        patient = make_patient()
        client = APIClient(enforce_csrf_checks=True)
        self.start(client)
        client.force_login(patient.user)
        self.assertEqual(client.post(BASE_URL + "claim/", {}, format="json").status_code, 403)

    def test_patient_continues_after_claim_with_session_only(self):
        patient = make_patient()
        self.start()
        self.run_until("auth")
        self.client.force_login(patient.user)
        self.post("claim/")
        data = self.answer("basics", BASICS).json()
        self.assertEqual(data["node"]["id"], "glp1_history")
        self.patient_data = data

    def test_under_18_is_disqualified_over_the_api(self):
        patient = make_patient()
        self.start()
        self.run_until("auth")
        self.client.force_login(patient.user)
        self.post("claim/")
        data = self.answer("basics", {**BASICS, "dob": "2020-01-01"}).json()
        self.assertEqual(data["status"], "disqualified")
        self.assertEqual(data["disqualify_reason"], "under_18")
        self.assertEqual(self.answer("no_proceed_age", {}).status_code, 409)


class UploadUrlTests(ApiTestCase):
    def test_returns_presigned_post(self):
        self.start()
        with patched_storage():
            response = self.post("upload-url/", {"kind": "id_photo", "content_type": "image/jpeg", "size_bytes": 5000})
        self.assertEqual(response.status_code, 201)
        body = response.json()
        uuid.UUID(body["file_id"])
        self.assertIn("url", body["upload"])

    def test_validation(self):
        self.start()
        with patched_storage():
            for body in ({}, {"kind": "id_photo", "content_type": "text/html", "size_bytes": 10},
                         {"kind": "id_photo", "content_type": "image/png", "size_bytes": 99999999},
                         {"kind": "evil", "content_type": "image/png", "size_bytes": 10},
                         {"kind": ["id_photo"], "content_type": "image/png", "size_bytes": 10}):
                self.assertEqual(self.post("upload-url/", body).status_code, 400, body)

    def test_requires_token(self):
        self.assertEqual(self.post("upload-url/", {"kind": "id_photo", "content_type": "image/png", "size_bytes": 10}).status_code, 404)

    @override_settings(PHI_UPLOAD_BUCKET="")
    def test_storage_not_configured(self):
        self.start()
        response = self.post("upload-url/", {"kind": "id_photo", "content_type": "image/png", "size_bytes": 10})
        self.assertEqual(response.status_code, 503)
