import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)
from apps.questionnaires.services import duplicate_version, publish_version
from apps.questionnaires.validation import (
    reachable_step_keys,
    resolve_next_step,
    validate_field_value,
    validate_responses_against_version,
)

User = get_user_model()


class QuestionnaireValidationTests(TestCase):
    def test_email_validation(self):
        error = validate_field_value(
            field_type="email",
            value="not-an-email",
            required=True,
            validation_rules=[],
            label="Email",
        )
        self.assertIsNotNone(error)

    def test_sql_injection_rejected(self):
        error = validate_field_value(
            field_type="text",
            value="'; DROP TABLE users;--",
            required=True,
            validation_rules=[],
            label="Name",
        )
        self.assertIsNotNone(error)

    def test_single_choice_validates_options(self):
        error = validate_field_value(
            field_type="single_choice",
            value="invalid",
            required=True,
            validation_rules=[],
            label="Goal",
            options=[{"value": "a", "label": "A"}],
        )
        self.assertIsNotNone(error)

    def test_address_group_requires_verified_selection(self):
        error = validate_field_value(
            field_type="address_group",
            value={
                "address": "123 Main St",
                "city": "Denver",
                "zip": "80202",
                "county": "Denver County",
                "verified": False,
            },
            required=True,
            validation_rules=[],
            label="Home address",
        )
        self.assertIsNotNone(error)

    def test_address_group_rejects_sql_injection_in_street(self):
        error = validate_field_value(
            field_type="address_group",
            value={
                "address": "'; DROP TABLE users;--",
                "city": "Denver",
                "zip": "80202",
                "county": "Denver County",
                "verified": True,
            },
            required=True,
            validation_rules=[],
            label="Home address",
        )
        self.assertIsNotNone(error)

    def test_address_group_accepts_verified_address(self):
        error = validate_field_value(
            field_type="address_group",
            value={
                "address": "123 Main St",
                "city": "Denver",
                "zip": "80202",
                "county": "Denver County",
                "verified": True,
            },
            required=True,
            validation_rules=[],
            label="Home address",
        )
        self.assertIsNone(error)

    def test_step_fields_partial_skips_unanswered_required(self):
        from types import SimpleNamespace

        from apps.questionnaires.validation import validate_step_fields

        fields = [
            SimpleNamespace(
                field_key="drug_type",
                field_type="single_choice",
                label="Drug type",
                required=True,
                validation_rules=[],
                options=[{"value": "injections", "label": "Injections"}],
                visibility_rule=None,
            ),
            SimpleNamespace(
                field_key="compounding",
                field_type="single_choice",
                label="Which compounding drug",
                required=True,
                validation_rules=[],
                options=[{"value": "a", "label": "A"}],
                visibility_rule=None,
            ),
        ]
        responses = {"drug_type": "injections"}

        # Strict (final) validation flags the unanswered required field.
        strict = validate_step_fields(fields, responses, enforce_required=True)
        self.assertIn("compounding", strict)

        # Incremental save only validates provided answers.
        partial = validate_step_fields(fields, responses, enforce_required=False)
        self.assertEqual(partial, {})

    def test_step_fields_partial_still_rejects_bad_provided_value(self):
        from types import SimpleNamespace

        from apps.questionnaires.validation import validate_step_fields

        fields = [
            SimpleNamespace(
                field_key="drug_type",
                field_type="single_choice",
                label="Drug type",
                required=True,
                validation_rules=[],
                options=[{"value": "injections", "label": "Injections"}],
                visibility_rule=None,
            ),
        ]
        partial = validate_step_fields(
            fields, {"drug_type": "not-an-option"}, enforce_required=False
        )
        self.assertIn("drug_type", partial)


class QuestionnaireStaffApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.questionnaire = Questionnaire.objects.create(slug="qualify", title="Qualify")
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=self.questionnaire,
            version_label="1.0.0",
        )

    def test_staff_can_list_questionnaires(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/staff/questionnaires/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_active_questionnaire_404_without_publish(self):
        response = self.client.get("/api/questionnaires/qualify/active/")
        self.assertEqual(response.status_code, 404)

    def test_staff_create_account_field_persists_sub_field_mappings(self):
        step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="account",
            sort_order=0,
            title="Account",
        )
        self.client.force_authenticate(user=self.staff)
        options = [
            {
                "value": "first_name",
                "label": "Legal first name",
                "backend": "register.first_name",
                "beluga": "beluga:firstName",
            },
            {
                "value": "last_name",
                "label": "Legal last name",
                "backend": "register.last_name",
                "beluga": "beluga:lastName",
            },
            {
                "value": "phone",
                "label": "Phone",
                "backend": "register.phone",
                "beluga": "beluga:phone",
            },
            {
                "value": "email",
                "label": "Email",
                "backend": "register.email",
                "beluga": "beluga:email",
            },
            {
                "value": "password",
                "label": "Password",
                "backend": "register.password",
                "beluga": "",
            },
            {
                "value": "confirm_password",
                "label": "Re-enter password",
                "backend": "",
                "beluga": "",
            },
        ]
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/account/fields/",
            {
                "field_key": "account",
                "field_type": "account",
                "label": "Create your account",
                "maps_to_section": "",
                "required": True,
                "options": options,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        field = QuestionnaireField.objects.get(step=step, field_key="account")
        self.assertEqual(field.options[3]["backend"], "register.email")
        self.assertEqual(field.options[3]["beluga"], "beluga:email")

    def test_staff_create_single_choice_field_maps_beluga_at_field_level(self):
        step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="sex_step",
            sort_order=0,
            title="Sex",
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/sex_step/fields/",
            {
                "field_key": "sex",
                "field_type": "single_choice",
                "label": "Sex assigned at birth",
                "maps_to_section": "beluga:sex",
                "required": True,
                "options": [
                    {"value": "male", "label": "Male", "beluga": ""},
                    {"value": "female", "label": "Female", "beluga": ""},
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        field = QuestionnaireField.objects.get(step=step, field_key="sex")
        self.assertEqual(field.maps_to_section, "beluga:sex")

    def test_staff_create_single_choice_field_persists_option_beluga_mappings(self):
        step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="goals",
            sort_order=0,
            title="Goals",
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/goals/fields/",
            {
                "field_key": "primary_goal",
                "field_type": "single_choice",
                "label": "What is your primary goal?",
                "maps_to_section": "",
                "required": True,
                "options": [
                    {
                        "value": "lose_weight",
                        "label": "Lose weight",
                        "beluga": "beluga:sex",
                    },
                    {
                        "value": "feel_better",
                        "label": "Feel better",
                        "beluga": "",
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        field = QuestionnaireField.objects.get(step=step, field_key="primary_goal")
        self.assertEqual(field.options[0]["beluga"], "beluga:sex")

    def test_field_key_must_be_unique_across_version_steps(self):
        # A field key on one step blocks the same key on another step, since
        # patient answers share one flat map keyed by field_key.
        step_a = QuestionnaireStep.objects.create(
            version=self.version, step_key="pills", sort_order=1, title="Pills"
        )
        QuestionnaireStep.objects.create(
            version=self.version,
            step_key="injections",
            sort_order=2,
            title="Injections",
        )
        QuestionnaireField.objects.create(
            step=step_a,
            field_key="kind",
            field_type="single_choice",
            label="So you want pills, ok, what kind?",
            options=[{"value": "wegovy", "label": "Wegovy"}],
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/injections/fields/",
            {
                "field_key": "kind",
                "field_type": "single_choice",
                "label": "So you want injections, ok, what kind?",
                "maps_to_section": "",
                "required": True,
                "options": [{"value": "peptide", "label": "Peptide"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("field_key", response.json())

    def test_patch_field_key_rename_and_uniqueness(self):
        step = QuestionnaireStep.objects.create(
            version=self.version, step_key="conditions", sort_order=1, title="Conditions"
        )
        other = QuestionnaireStep.objects.create(
            version=self.version, step_key="allergies", sort_order=2, title="Allergies"
        )
        field = QuestionnaireField.objects.create(
            step=step,
            field_key="medical_conditions",
            field_type="yes_no",
            label="Diabetes?",
            options=[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}],
        )
        QuestionnaireField.objects.create(
            step=other,
            field_key="has_allergies",
            field_type="yes_no",
            label="Allergies?",
            options=[{"value": "yes", "label": "Yes"}, {"value": "no", "label": "No"}],
        )
        self.client.force_authenticate(user=self.staff)
        url = (
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/"
            f"{self.version.id}/steps/conditions/fields/medical_conditions/"
        )
        response = self.client.patch(
            url,
            {"field_key": "type_2_diabetes"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        field.refresh_from_db()
        self.assertEqual(field.field_key, "type_2_diabetes")

        renamed_url = (
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/"
            f"{self.version.id}/steps/conditions/fields/type_2_diabetes/"
        )
        response = self.client.patch(
            renamed_url,
            {"field_key": "has_allergies"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("field_key", response.json())

    def _build_branching_version(self):
        # Drugs branches: injections -> inj step, else -> pill step. Both branch
        # steps reuse the field key "kind" (the bug condition).
        drugs = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="drugs",
            sort_order=0,
            title="Drugs",
            routing_rules=[
                {
                    "when_field": "drug_type",
                    "when_value": "injections",
                    "next_step_key": "inj",
                },
                {"when_field": "__default__", "when_value": "", "next_step_key": "pill"},
            ],
        )
        QuestionnaireField.objects.create(
            step=drugs,
            field_key="drug_type",
            field_type="single_choice",
            label="glp1",
            options=[
                {"value": "pills", "label": "pills"},
                {"value": "injections", "label": "injections"},
            ],
        )
        # Both branches converge back to the account step (explicit default
        # edges), mirroring the real flow.
        pill = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="pill",
            sort_order=1,
            title="Pick pill type",
            routing_rules=[
                {"when_field": "__default__", "when_value": "", "next_step_key": "account"},
            ],
        )
        QuestionnaireField.objects.create(
            step=pill,
            field_key="kind",
            field_type="single_choice",
            label="So you want pills, ok, what kind?",
            required=True,
            options=[
                {"value": "wegovy", "label": "wegovy"},
                {"value": "feyona", "label": "feyona"},
            ],
        )
        inj = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="inj",
            sort_order=2,
            title="Pick injection type",
            routing_rules=[
                {"when_field": "__default__", "when_value": "", "next_step_key": "account"},
            ],
        )
        QuestionnaireField.objects.create(
            step=inj,
            field_key="kind",
            field_type="single_choice",
            label="So you want injections, ok, what kind?",
            required=True,
            options=[
                {"value": "exenatide", "label": "exenatide"},
                {"value": "peptide", "label": "peptide"},
            ],
        )
        QuestionnaireStep.objects.create(
            version=self.version, step_key="account", sort_order=3, title="Account"
        )

    def test_resolve_next_step_follows_answer_branch(self):
        self._build_branching_version()
        steps = list(self.version.steps.all())
        drugs = next(s for s in steps if s.step_key == "drugs")
        self.assertEqual(
            resolve_next_step(drugs, {"drug_type": "injections"}, steps).step_key,
            "inj",
        )
        self.assertEqual(
            resolve_next_step(drugs, {"drug_type": "pills"}, steps).step_key,
            "pill",
        )

    def test_reachable_steps_exclude_unvisited_branch(self):
        self._build_branching_version()
        steps = list(self.version.steps.all())
        self.assertEqual(
            reachable_step_keys(steps, {"drug_type": "pills"}),
            {"drugs", "pill", "account"},
        )
        self.assertEqual(
            reachable_step_keys(steps, {"drug_type": "injections"}),
            {"drugs", "inj", "account"},
        )

    def test_pill_answer_does_not_trip_offroute_injection_field(self):
        # The reported bug: choosing a pill option must not fail the injection
        # step's option check, even though both fields share the key "kind".
        self._build_branching_version()
        errors = validate_responses_against_version(
            self.version.id,
            {"drug_type": "pills", "kind": "feyona"},
            enforce_required=False,
        )
        self.assertEqual(errors, {})

    def _build_implicit_default_version(self):
        # Mirrors the real published flow: step_1 branches only on injections /
        # compounding (no default rule), the account step sits *before* the
        # compounding step by sort_order, and compounding loops back to account.
        step1 = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="step_1",
            sort_order=0,
            title="Drugs",
            routing_rules=[
                {
                    "when_field": "glp1_pills",
                    "when_value": "injections",
                    "next_step_key": "step_3",
                },
                {
                    "when_field": "glp1_pills",
                    "when_value": "compounding",
                    "next_step_key": "step_5",
                },
            ],
        )
        QuestionnaireField.objects.create(
            step=step1,
            field_key="glp1_pills",
            field_type="single_choice",
            label="What do you want?",
            options=[
                {"value": "pills", "label": "pills"},
                {"value": "injections", "label": "injections"},
                {"value": "compounding", "label": "compounding"},
            ],
        )
        QuestionnaireStep.objects.create(
            version=self.version,
            step_key="step_2",
            sort_order=1,
            title="Pick pill type",
            routing_rules=[
                {"when_field": "__default__", "when_value": "", "next_step_key": "step_4"},
            ],
        )
        QuestionnaireStep.objects.create(
            version=self.version,
            step_key="step_3",
            sort_order=2,
            title="Pick injection type",
        )
        account = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="step_4",
            sort_order=3,
            title="Account",
        )
        QuestionnaireField.objects.create(
            step=account,
            field_key="account",
            field_type="account",
            label="Create your account",
        )
        QuestionnaireStep.objects.create(
            version=self.version,
            step_key="step_5",
            sort_order=4,
            title="Compounding",
            routing_rules=[
                {"when_field": "__default__", "when_value": "", "next_step_key": "step_4"},
            ],
        )

    def test_unmatched_answer_falls_through_to_natural_next(self):
        # "pills" matches no answer rule and step_1 has no default rule — it must
        # fall through to the natural next step (step_2), not dead-end.
        self._build_implicit_default_version()
        steps = list(self.version.steps.prefetch_related("fields").all())
        step1 = next(s for s in steps if s.step_key == "step_1")
        self.assertEqual(
            resolve_next_step(step1, {"glp1_pills": "pills"}, steps).step_key,
            "step_2",
        )

    def test_account_step_is_terminal_despite_later_sort_order(self):
        # The account step ends qualify even though step_5 sorts after it; it must
        # never auto-advance to the off-route compounding step.
        self._build_implicit_default_version()
        steps = list(self.version.steps.prefetch_related("fields").all())
        account = next(s for s in steps if s.step_key == "step_4")
        self.assertIsNone(resolve_next_step(account, {}, steps))

    def test_injection_branch_reaches_account_via_natural_next(self):
        # step_3 (injection) has no rules; its natural next by sort_order is the
        # account step, and the route stops there (not at compounding step_5).
        self._build_implicit_default_version()
        steps = list(self.version.steps.prefetch_related("fields").all())
        self.assertEqual(
            reachable_step_keys(steps, {"glp1_pills": "injections"}),
            {"step_1", "step_3", "step_4"},
        )
        self.assertEqual(
            reachable_step_keys(steps, {"glp1_pills": "pills"}),
            {"step_1", "step_2", "step_4"},
        )

    def test_staff_create_address_field_persists_sub_field_mappings(self):
        step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="shipping",
            sort_order=0,
            title="Shipping",
        )
        self.client.force_authenticate(user=self.staff)
        options = [
            {
                "value": "address",
                "label": "Street address",
                "backend": "intake.medication_preferences.shipping_address",
                "beluga": "beluga:address",
            },
            {
                "value": "city",
                "label": "City",
                "backend": "intake.medication_preferences.shipping_city",
                "beluga": "beluga:city",
            },
            {
                "value": "state",
                "label": "State",
                "backend": "intake.medication_preferences.shipping_state",
                "beluga": "beluga:state",
            },
            {
                "value": "zip",
                "label": "ZIP code",
                "backend": "intake.medication_preferences.shipping_zip",
                "beluga": "beluga:zip",
            },
            {
                "value": "county",
                "label": "County",
                "backend": "intake.medication_preferences.shipping_county",
                "beluga": "",
            },
            {
                "value": "country",
                "label": "Country",
                "backend": "intake.medication_preferences.shipping_country",
                "beluga": "",
            },
            {
                "value": "verified",
                "label": "Verified flag",
                "backend": "intake.medication_preferences.shipping_address_verified",
                "beluga": "",
            },
        ]
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/shipping/fields/",
            {
                "field_key": "shipping_address",
                "field_type": "address_group",
                "label": "Shipping address",
                "maps_to_section": "medication_preferences",
                "required": True,
                "options": options,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        field = step.fields.get(field_key="shipping_address")
        self.assertEqual(field.field_type, "address_group")
        self.assertEqual(len(field.options), 7)
        self.assertEqual(field.options[2]["beluga"], "beluga:state")

    def test_staff_create_address_field_rejects_invalid_backend_mapping(self):
        QuestionnaireStep.objects.create(
            version=self.version,
            step_key="shipping",
            sort_order=0,
            title="Shipping",
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/shipping/fields/",
            {
                "field_key": "shipping_address",
                "field_type": "address_group",
                "label": "Shipping address",
                "maps_to_section": "medication_preferences",
                "required": True,
                "options": [
                    {
                        "value": "address",
                        "label": "Street address",
                        "backend": "register.email",
                        "beluga": "beluga:address",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_staff_create_account_field_rejects_invalid_beluga_mapping(self):
        QuestionnaireStep.objects.create(
            version=self.version,
            step_key="account",
            sort_order=0,
            title="Account",
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.questionnaire.slug}/versions/{self.version.id}/steps/account/fields/",
            {
                "field_key": "account",
                "field_type": "account",
                "label": "Create your account",
                "maps_to_section": "",
                "required": True,
                "options": [
                    {
                        "value": "email",
                        "label": "Email",
                        "backend": "register.email",
                        "beluga": "beluga:password",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class QuestionnairePublishRoutingTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff2@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.qualify = Questionnaire.objects.create(
            slug="qualify",
            title="Qualify",
            questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        )
        self.intake = Questionnaire.objects.create(
            slug="intake",
            title="Intake",
            questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
        )
        self.v1 = QuestionnaireVersion.objects.create(
            questionnaire=self.qualify,
            version_label="1.0.0",
        )
        self.v2 = QuestionnaireVersion.objects.create(
            questionnaire=self.qualify,
            version_label="2.0.0",
        )
        for version in (self.v1, self.v2):
            QuestionnaireStep.objects.create(
                version=version,
                step_key="start",
                sort_order=0,
                title="Start",
            )

    def test_unreachable_prior_published_is_superseded(self):
        # A prior published qualify with no CTAs and not the default entry is
        # unreachable once a new version publishes, so it is archived.
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.save()
        self.v2.intake_routing_rules = routing
        self.v2.save()
        publish_version(self.v1)
        self.v1.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.PUBLISHED)

        publish_version(self.v2)
        self.v1.refresh_from_db()
        self.v2.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.ARCHIVED)
        self.assertEqual(self.v2.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_publish_supersedes_prior_default_entry_without_cta(self):
        # The seed default-entry version has no CTA. Publishing a new version of
        # the same questionnaire that owns a CTA must archive the stale prior
        # default-entry version so only one published version remains live.
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.is_default_entry = True
        self.v1.save()
        publish_version(self.v1)

        self.v2.intake_routing_rules = routing
        self.v2.cta_ids = ["home_hero"]
        self.v2.save()
        publish_version(self.v2)

        self.v1.refresh_from_db()
        self.v2.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.ARCHIVED)
        self.assertEqual(self.v2.status, QuestionnaireVersion.Status.PUBLISHED)

        from apps.questionnaires.services import get_qualify_version_for_cta

        self.assertEqual(get_qualify_version_for_cta("home_hero").id, self.v2.id)

    def test_staff_can_archive_published_version(self):
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.save()
        publish_version(self.v1)
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.post(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/archive/"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.v1.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.ARCHIVED)

    def test_archive_rejects_non_published_version(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.post(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/archive/"
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_staff_can_delete_draft_version(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.delete(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/"
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(
            QuestionnaireVersion.objects.filter(id=self.v1.id).exists()
        )

    def test_delete_rejects_published_version(self):
        self.v1.intake_routing_rules = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.save(update_fields=["intake_routing_rules"])
        publish_version(self.v1)
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.delete(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/"
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertTrue(
            QuestionnaireVersion.objects.filter(id=self.v1.id).exists()
        )

    def test_staff_can_delete_unused_archived_version(self):
        routing = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.save(update_fields=["intake_routing_rules"])
        publish_version(self.v1)
        self.v1.status = QuestionnaireVersion.Status.ARCHIVED
        self.v1.save(update_fields=["status"])
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.delete(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/"
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(
            QuestionnaireVersion.objects.filter(id=self.v1.id).exists()
        )

    def test_delete_rejects_archived_version_in_use(self):
        from apps.eligibility.models import EligibilityResponse

        routing = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.save(update_fields=["intake_routing_rules"])
        publish_version(self.v1)
        self.v1.status = QuestionnaireVersion.Status.ARCHIVED
        self.v1.save(update_fields=["status"])
        EligibilityResponse.objects.create(
            questionnaire_version_id=self.v1.id,
            questionnaire_responses={"x": "1"},
        )
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.delete(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/"
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("used", response.json()["detail"].lower())

    def test_active_qualify_falls_back_when_pinned_version_archived(self):
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.is_default_entry = True
        self.v1.save()
        publish_version(self.v1)
        self.v2.intake_routing_rules = routing
        self.v2.is_default_entry = True
        self.v2.save()
        publish_version(self.v2)
        # v1 is now archived (superseded). A session still pinned to v1 should
        # be served the current published entry (v2), not the archived schema.
        self.v1.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.ARCHIVED)
        response = self.client.get(
            f"/api/questionnaires/qualify/active/?version_id={self.v1.id}"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["id"], str(self.v2.id))

    def test_active_intake_serves_archived_pinned_version(self):
        # A patient mid-intake is pinned to iv1. Staff then publishes iv2,
        # archiving iv1. Requesting the pinned (now archived) intake version must
        # return iv1 as-is so the in-progress intake is not disrupted — unlike
        # the qualify funnel, which advances to the latest published flow.
        iv1 = QuestionnaireVersion.objects.create(
            questionnaire=self.intake,
            version_label="1.0.0",
        )
        iv2 = QuestionnaireVersion.objects.create(
            questionnaire=self.intake,
            version_label="2.0.0",
        )
        for version in (iv1, iv2):
            QuestionnaireStep.objects.create(
                version=version,
                step_key="start",
                sort_order=0,
                title="Start",
            )
        publish_version(iv1)
        publish_version(iv2)
        iv1.refresh_from_db()
        self.assertEqual(iv1.status, QuestionnaireVersion.Status.ARCHIVED)
        response = self.client.get(
            f"/api/questionnaires/intake/active/?version_id={iv1.id}"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["id"], str(iv1.id))

    def test_active_intake_falls_back_when_pinned_version_draft(self):
        # A draft intake version was never live, so a pin to it should fall back
        # to the current published intake entry.
        published = QuestionnaireVersion.objects.create(
            questionnaire=self.intake,
            version_label="1.0.0",
        )
        draft = QuestionnaireVersion.objects.create(
            questionnaire=self.intake,
            version_label="2.0.0",
        )
        for version in (published, draft):
            QuestionnaireStep.objects.create(
                version=version,
                step_key="start",
                sort_order=0,
                title="Start",
            )
        publish_version(published)
        response = self.client.get(
            f"/api/questionnaires/intake/active/?version_id={draft.id}"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["id"], str(published.id))

    def test_rename_draft_rejects_duplicate_label(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v2.id}/",
            {"version_label": self.v1.version_label},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.v2.refresh_from_db()
        self.assertEqual(self.v2.version_label, "2.0.0")

    def test_rename_draft_accepts_unique_label(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v2.id}/",
            {"version_label": "home-hero-v2"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.v2.refresh_from_db()
        self.assertEqual(self.v2.version_label, "home-hero-v2")

    def test_rename_published_version_allowed(self):
        # Renaming is cosmetic metadata and is permitted for published versions.
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.save()
        publish_version(self.v1)
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/",
            {"version_label": "live-home"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.v1.refresh_from_db()
        self.assertEqual(self.v1.version_label, "live-home")
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_routing_edit_on_published_version_rejected(self):
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.save()
        publish_version(self.v1)
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/",
            {"cta_ids": ["home_hero"]},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_same_questionnaire_versions_with_distinct_ctas_both_stay_published(
        self,
    ):
        # Two versions of the SAME qualify questionnaire mapped to different
        # CTAs must both remain published (publishing one must not retire the
        # other when they do not share a CTA).
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.cta_ids = ["home_hero"]
        self.v1.is_default_entry = True
        self.v1.save()
        self.v2.intake_routing_rules = routing
        self.v2.cta_ids = ["weight_loss_hero"]
        self.v2.save()
        publish_version(self.v1)
        publish_version(self.v2)
        self.v1.refresh_from_db()
        self.v2.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.PUBLISHED)
        self.assertEqual(self.v2.status, QuestionnaireVersion.Status.PUBLISHED)
        self.assertEqual(self.v1.cta_ids, ["home_hero"])
        self.assertEqual(self.v2.cta_ids, ["weight_loss_hero"])

    def test_publish_taking_last_cta_supersedes_prior_same_questionnaire(self):
        # Publishing v2 that claims v1's only CTA retires v1 (it loses its only
        # reason to stay live), matching "replace the qualify for that CTA".
        routing = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.intake_routing_rules = routing
        self.v1.cta_ids = ["weight_loss_hero"]
        self.v1.save()
        self.v2.intake_routing_rules = routing
        self.v2.cta_ids = ["weight_loss_hero"]
        self.v2.save()
        publish_version(self.v1)
        publish_version(self.v2)
        self.v1.refresh_from_db()
        self.v2.refresh_from_db()
        self.assertEqual(self.v1.status, QuestionnaireVersion.Status.ARCHIVED)
        self.assertEqual(self.v2.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_qualify_publish_requires_intake_routing(self):
        with self.assertRaises(ValueError):
            publish_version(self.v1)

    def test_staff_patch_persists_when_step_on_intake_rule(self):
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/",
            {
                "intake_routing_rules": [
                    {
                        "when_field": "__default__",
                        "when_value": "",
                        "intake_questionnaire_slug": "intake",
                        "when_step": "account",
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.v1.refresh_from_db()
        self.assertEqual(
            self.v1.intake_routing_rules[0]["when_step"], "account"
        )

    def test_default_rule_with_when_step_still_resolves_as_fallback(self):
        from apps.questionnaires.services import resolve_intake_questionnaire_slug

        self.v1.intake_routing_rules = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
                "when_step": "account",
            }
        ]
        self.v1.save()
        slug = resolve_intake_questionnaire_slug(self.v1, {})
        self.assertEqual(slug, "intake")

    def test_duplicate_copies_routing_and_intake_rules(self):
        step = self.v1.steps.get(step_key="start")
        step.routing_rules = [{"when_field": "x", "when_value": "1", "next_step_key": "end"}]
        step.position_x = 10
        step.position_y = 20
        step.save()
        QuestionnaireField.objects.create(
            step=step,
            field_key="x",
            field_type="single_choice",
            label="X",
            options=[{"value": "1", "label": "One"}],
        )
        self.v1.intake_routing_rules = [
            {
                "when_field": "x",
                "when_value": "1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.save()

        clone = duplicate_version(self.v1, created_by=self.staff)
        clone_step = clone.steps.get(step_key="start")
        self.assertEqual(clone_step.routing_rules, step.routing_rules)
        self.assertEqual(clone_step.position_x, 10)
        self.assertEqual(clone.intake_routing_rules, self.v1.intake_routing_rules)

    def test_repeated_duplicate_keeps_label_within_column_limit(self):
        # Duplicating copies-of-copies must not compound the "-copy-N" suffix
        # past the 32-char version_label column.
        self.v1.version_label = "this-is-a-fairly-long-label-name"  # 31 chars
        self.v1.save(update_fields=["version_label"])
        current = self.v1
        labels = set()
        for _ in range(6):
            current = duplicate_version(current, created_by=self.staff)
            self.assertLessEqual(len(current.version_label), 32)
            self.assertNotIn(current.version_label, labels)
            labels.add(current.version_label)

    def test_duplicate_endpoint_returns_201_for_long_label(self):
        self.v1.version_label = "another-long-version-label-here!"  # 32 chars
        self.v1.intake_routing_rules = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.save(update_fields=["version_label", "intake_routing_rules"])
        publish_version(self.v1)
        client = APIClient()
        client.force_authenticate(user=self.staff)
        response = client.post(
            f"/api/staff/questionnaires/{self.qualify.slug}/versions/{self.v1.id}/duplicate/"
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_resolve_intake_endpoint(self):
        self.v1.intake_routing_rules = [
            {
                "when_field": "med",
                "when_value": "glp1",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.v1.save()
        publish_version(self.v1)
        intake_version = QuestionnaireVersion.objects.create(
            questionnaire=self.intake,
            version_label="1.0.0",
        )
        QuestionnaireStep.objects.create(
            version=intake_version,
            step_key="start",
            sort_order=0,
            title="Start",
        )
        publish_version(intake_version)

        response = self.client.post(
            "/api/questionnaires/resolve-intake/",
            json.dumps(
                {
                    "qualify_version_id": str(self.v1.id),
                    "questionnaire_responses": {"med": "glp1"},
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["intake_questionnaire_slug"], "intake")
        self.assertEqual(body["version"]["questionnaire_slug"], "intake")


class MultiQualifyEntryTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff3@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.client = APIClient()
        self.wl = Questionnaire.objects.create(
            slug="qualify-weight-loss",
            title="Weight Loss Qualify",
            questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        )
        self.sh = Questionnaire.objects.create(
            slug="qualify-sexual-health",
            title="Sexual Health Qualify",
            questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        )

    def _version(self, questionnaire, label, **kwargs):
        kwargs.setdefault(
            "intake_routing_rules",
            [
                {
                    "when_field": "x",
                    "when_value": "1",
                    "intake_questionnaire_slug": "intake",
                }
            ],
        )
        version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label=label,
            **kwargs,
        )
        QuestionnaireStep.objects.create(
            version=version, step_key="start", sort_order=0, title="Start"
        )
        return version

    def test_multiple_qualify_versions_stay_published(self):
        v_wl = self._version(self.wl, "1.0.0", is_default_entry=True)
        v_sh = self._version(self.sh, "1.0.0", cta_ids=["sexual_health_hero"])
        publish_version(v_wl)
        publish_version(v_sh)
        v_wl.refresh_from_db()
        v_sh.refresh_from_db()
        self.assertEqual(v_wl.status, QuestionnaireVersion.Status.PUBLISHED)
        self.assertEqual(v_sh.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_cta_resolves_to_mapped_version(self):
        from apps.questionnaires.services import get_qualify_version_for_cta

        v_wl = self._version(self.wl, "1.0.0", is_default_entry=True)
        v_sh = self._version(self.sh, "1.0.0", cta_ids=["sexual_health_hero"])
        publish_version(v_wl)
        publish_version(v_sh)
        resolved = get_qualify_version_for_cta("sexual_health_hero")
        self.assertEqual(resolved.id, v_sh.id)

    def test_unmapped_cta_falls_back_to_default(self):
        from apps.questionnaires.services import get_qualify_version_for_cta

        v_wl = self._version(self.wl, "1.0.0", is_default_entry=True)
        v_sh = self._version(self.sh, "1.0.0", cta_ids=["sexual_health_hero"])
        publish_version(v_wl)
        publish_version(v_sh)
        resolved = get_qualify_version_for_cta("totally_unknown_cta")
        self.assertEqual(resolved.id, v_wl.id)

    def test_publish_transfers_cta_from_other_published_qualify(self):
        v_wl = self._version(self.wl, "1.0.0", cta_ids=["shared_cta"], is_default_entry=True)
        publish_version(v_wl)
        v_sh = self._version(self.sh, "1.0.0", cta_ids=["shared_cta"])
        publish_version(v_sh)
        v_wl.refresh_from_db()
        v_sh.refresh_from_db()
        self.assertNotIn("shared_cta", v_wl.cta_ids)
        self.assertIn("shared_cta", v_sh.cta_ids)

    def test_publish_default_unsets_other_default(self):
        v_wl = self._version(self.wl, "1.0.0", is_default_entry=True)
        publish_version(v_wl)
        v_sh = self._version(self.sh, "1.0.0", is_default_entry=True)
        publish_version(v_sh)
        v_wl.refresh_from_db()
        v_sh.refresh_from_db()
        self.assertFalse(v_wl.is_default_entry)
        self.assertTrue(v_sh.is_default_entry)

    def test_staff_patch_saves_conflicting_cta_without_touching_published(self):
        # Saving a draft with a CTA still owned by a published version must NOT
        # modify the published version — the takeover only happens at publish.
        v_wl = self._version(self.wl, "1.0.0", cta_ids=["owned_cta"])
        publish_version(v_wl)
        draft = self._version(self.sh, "1.0.0")
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.sh.slug}/versions/{draft.id}/",
            {"cta_ids": ["owned_cta"]},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        draft.refresh_from_db()
        v_wl.refresh_from_db()
        self.assertEqual(draft.cta_ids, ["owned_cta"])
        # Published version is untouched until the draft is published.
        self.assertEqual(v_wl.cta_ids, ["owned_cta"])
        self.assertEqual(v_wl.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_publishing_draft_claims_cta_from_published_keeping_others(self):
        v_wl = self._version(self.wl, "1.0.0", cta_ids=["owned_cta", "other_cta"])
        publish_version(v_wl)
        draft = self._version(self.sh, "1.0.0", cta_ids=["owned_cta"])
        publish_version(draft)
        v_wl.refresh_from_db()
        draft.refresh_from_db()
        self.assertEqual(draft.cta_ids, ["owned_cta"])
        self.assertEqual(v_wl.cta_ids, ["other_cta"])
        self.assertEqual(v_wl.status, QuestionnaireVersion.Status.PUBLISHED)
        self.assertEqual(draft.status, QuestionnaireVersion.Status.PUBLISHED)

    def test_publishing_draft_claiming_last_cta_archives_published(self):
        v_wl = self._version(self.wl, "1.0.0", cta_ids=["only_cta"])
        publish_version(v_wl)
        draft = self._version(self.sh, "1.0.0", cta_ids=["only_cta"])
        publish_version(draft)
        v_wl.refresh_from_db()
        self.assertEqual(v_wl.cta_ids, [])
        self.assertEqual(v_wl.status, QuestionnaireVersion.Status.ARCHIVED)

    def test_staff_qualify_cta_ownership_lists_published_mappings(self):
        v_wl = self._version(self.wl, "1.0.0", cta_ids=["home_hero"])
        publish_version(v_wl)
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/staff/questionnaires/qualify-cta-ownership/")
        self.assertEqual(response.status_code, 200, response.content)
        rows = response.json()["ownership"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["cta_id"], "home_hero")
        self.assertEqual(rows[0]["questionnaire_slug"], self.wl.slug)

    def test_active_qualify_loads_distinct_slug_by_version_id(self):
        v_sh = self._version(self.sh, "1.0.0", cta_ids=["sexual_health_hero"])
        publish_version(v_sh)
        resp = self.client.get(
            f"/api/questionnaires/qualify/active/?version_id={v_sh.id}"
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(
            resp.json()["questionnaire_slug"], "qualify-sexual-health"
        )

    def test_staff_patch_sets_cta_and_default_on_draft(self):
        draft = self._version(self.wl, "1.0.0")
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.wl.slug}/versions/{draft.id}/",
            {"cta_ids": ["home_hero", "home_hero", " "], "is_default_entry": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        draft.refresh_from_db()
        self.assertEqual(draft.cta_ids, ["home_hero"])
        self.assertTrue(draft.is_default_entry)


class StaffQuestionnaireCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="staff-crud@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.intake = Questionnaire.objects.create(slug="intake", title="Intake")
        self.qualify = Questionnaire.objects.create(slug="qualify", title="Qualify")
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=self.qualify,
            version_label="1.0.0",
        )
        self.step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="goals",
            sort_order=0,
            title="Goals",
        )
        QuestionnaireField.objects.create(
            step=self.step,
            field_key="goal",
            field_type="single_choice",
            label="Goal",
            options=[{"value": "lose", "label": "Lose weight"}],
        )

    def test_staff_can_get_questionnaire_detail(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(f"/api/staff/questionnaires/{self.qualify.slug}/")
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["slug"], "qualify")
        self.assertEqual(body["title"], "Qualify")

    def test_staff_can_patch_questionnaire_slug(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/",
            {"slug": "qualify-renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["slug"], "qualify-renamed")
        self.assertTrue(
            Questionnaire.objects.filter(slug="qualify-renamed").exists()
        )
        self.assertFalse(Questionnaire.objects.filter(slug="qualify").exists())

    def test_staff_can_patch_questionnaire_title(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/",
            {"title": "Qualify funnel"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["title"], "Qualify funnel")
        self.qualify.refresh_from_db()
        self.assertEqual(self.qualify.title, "Qualify funnel")

    def test_patch_rejects_empty_title(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/",
            {"title": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("title", response.json())

    def test_patch_rejects_duplicate_slug(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.qualify.slug}/",
            {"slug": "intake"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_patch_rejects_malicious_slug(self):
        from apps.common.validation.payloads import STRICT_FIELD_ATTACKS

        self.client.force_authenticate(user=self.staff)
        for attack in STRICT_FIELD_ATTACKS:
            response = self.client.patch(
                f"/api/staff/questionnaires/{self.qualify.slug}/",
                {"slug": attack},
                format="json",
            )
            self.assertEqual(
                response.status_code,
                400,
                f"Expected 400 for slug attack: {attack!r} got {response.content}",
            )

    def test_patch_blocks_slug_rename_when_referenced_by_routing(self):
        self.version.intake_routing_rules = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.version.save(update_fields=["intake_routing_rules"])
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/staff/questionnaires/{self.intake.slug}/",
            {"slug": "intake-renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("referenced", response.json()["detail"].lower())

    def test_staff_can_delete_unused_questionnaire(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(f"/api/staff/questionnaires/{self.qualify.slug}/")
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(Questionnaire.objects.filter(slug="qualify").exists())

    def test_delete_rejects_published_versions(self):
        self.version.intake_routing_rules = [
            {
                "when_field": "__default__",
                "when_value": "",
                "intake_questionnaire_slug": "intake",
            }
        ]
        self.version.save(update_fields=["intake_routing_rules"])
        publish_version(self.version)
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(f"/api/staff/questionnaires/{self.qualify.slug}/")
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("published", response.json()["detail"].lower())

    def test_delete_rejects_questionnaire_referenced_by_routing(self):
        other = Questionnaire.objects.create(slug="other-qualify", title="Other")
        version = QuestionnaireVersion.objects.create(
            questionnaire=other,
            version_label="1.0.0",
            intake_routing_rules=[
                {
                    "when_field": "__default__",
                    "when_value": "",
                    "intake_questionnaire_slug": "intake",
                }
            ],
        )
        version.save()
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(f"/api/staff/questionnaires/{self.intake.slug}/")
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("referenced", response.json()["detail"].lower())

    def test_delete_rejects_questionnaire_with_experiments(self):
        from apps.questionnaires.models import Experiment

        Experiment.objects.create(
            name="A/B test",
            questionnaire=self.qualify,
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.delete(f"/api/staff/questionnaires/{self.qualify.slug}/")
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("experiment", response.json()["detail"].lower())

    def test_staff_can_duplicate_questionnaire_with_versions(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.qualify.slug}/duplicate/",
            {"slug": "qualify-copy", "title": "Qualify copy"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body["slug"], "qualify-copy")
        self.assertEqual(body["title"], "Qualify copy")
        clone = Questionnaire.objects.get(slug="qualify-copy")
        self.assertEqual(clone.versions.count(), 1)
        clone_version = clone.versions.get()
        self.assertEqual(clone_version.status, QuestionnaireVersion.Status.DRAFT)
        self.assertEqual(clone_version.steps.count(), 1)
        self.assertEqual(
            clone_version.steps.get().fields.get().field_key,
            "goal",
        )
        self.assertTrue(Questionnaire.objects.filter(slug="qualify").exists())

    def test_duplicate_auto_generates_slug_when_omitted(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.qualify.slug}/duplicate/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        slug = response.json()["slug"]
        self.assertTrue(slug.startswith("qualify-copy-"))
        self.assertTrue(Questionnaire.objects.filter(slug=slug).exists())

    def test_duplicate_rejects_malicious_slug(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/staff/questionnaires/{self.qualify.slug}/duplicate/",
            {"slug": "../../etc/passwd"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
