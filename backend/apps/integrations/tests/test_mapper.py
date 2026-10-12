from datetime import date

from django.test import SimpleTestCase

from apps.integrations.adapters import mapper
from apps.integrations.exceptions import PayloadInvalid


def neutral(**overrides):
    base = {
        "consents_signed": True,
        "patient": {
            "first_name": "Pat", "last_name": "Tester", "dob": date(1985, 3, 9), "phone": "+1 (512) 555-0100",
            "email": "pat@example.com", "address": "1 Main St", "city": "Austin", "state": "tx", "zip": "78701-1234",
            "sex": "female",
        },
        "patient_preference": [{"name": "Semaglutide", "strength": "0.25mg", "quantity": "1", "refills": "0", "days_supply": 30, "med_id": "M1"}],
        "intake_results": [{"question": "Sleep?", "answer": "7 hours"}],
    }
    base.update(overrides)
    return base


class FindEmptyTests(SimpleTestCase):
    def test_flags_none_empty_string_whitespace_and_empty_containers(self):
        body = {"a": None, "b": "", "c": "  ", "d": [], "e": {}, "f": {"g": [""]}, "ok": "x", "zero": 0, "false": False}
        self.assertEqual(
            sorted(mapper.find_empty(body)), sorted(["a", "b", "c", "d", "e", "f.g[0]"])
        )

    def test_clean_body_has_no_problems(self):
        self.assertEqual(mapper.find_empty({"a": "x", "b": [1, {"c": "d"}]}), [])

    def test_assert_no_empty_raises_with_paths_not_values(self):
        with self.assertRaises(PayloadInvalid) as ctx:
            mapper.assert_no_empty({"formObj": {"firstName": "", "secret": "Pat"}})
        self.assertEqual(ctx.exception.fields, ["formObj.firstName"])
        self.assertNotIn("Pat", str(ctx.exception))


class BuildFormObjTests(SimpleTestCase):
    def test_maps_demographics_to_beluga_formats(self):
        form = mapper.build_form_obj(neutral())
        self.assertEqual(form["dob"], "03/09/1985")
        self.assertEqual(form["phone"], "5125550100")
        self.assertEqual(form["state"], "TX")
        self.assertEqual(form["zip"], "78701")
        self.assertEqual(form["sex"], "Female")
        self.assertIs(form["consentsSigned"], True)
        self.assertEqual(form["Q1"], "Sleep?")
        self.assertEqual(form["A1"], "7 hours")
        self.assertEqual(form["patientPreference"][0]["medId"], "M1")
        self.assertEqual(form["patientPreference"][0]["daysSupply"], "30")

    def test_iso_dob_string_is_converted(self):
        data = neutral()
        data["patient"]["dob"] = "1990-12-31"
        self.assertEqual(mapper.build_form_obj(data)["dob"], "12/31/1990")

    def test_rejects_each_missing_required_patient_field(self):
        for field in mapper.REQUIRED_PATIENT_FIELDS:
            data = neutral()
            data["patient"][field] = ""
            with self.subTest(field=field), self.assertRaises(PayloadInvalid) as ctx:
                mapper.build_form_obj(data)
            self.assertIn(f"patient.{field}", ctx.exception.fields)

    def test_rejects_none_values(self):
        data = neutral()
        data["patient"]["email"] = None
        with self.assertRaises(PayloadInvalid):
            mapper.build_form_obj(data)

    def test_rejects_unsigned_consent_and_missing_preference(self):
        with self.assertRaises(PayloadInvalid) as ctx:
            mapper.build_form_obj(neutral(consents_signed=False, patient_preference=[]))
        self.assertEqual(ctx.exception.fields, ["consents_signed", "patient_preference"])

    def test_rejects_malformed_phone_state_zip_dob_and_long_names(self):
        data = neutral()
        data["patient"].update(phone="123", state="Texas", zip="abc", dob="not a date", first_name="x" * 101)
        with self.assertRaises(PayloadInvalid) as ctx:
            mapper.build_form_obj(data)
        self.assertEqual(ctx.exception.fields, ["patient.first_name"])
        data["patient"]["first_name"] = "Pat"
        with self.assertRaises(PayloadInvalid) as ctx:
            mapper.build_form_obj(data)
        self.assertEqual(ctx.exception.fields, ["patient.dob", "patient.phone", "patient.state", "patient.zip"])

    def test_unknown_sex_maps_to_other_and_blank_sex_rejected(self):
        data = neutral()
        data["patient"]["sex"] = "intersex"
        self.assertEqual(mapper.build_form_obj(data)["sex"], "Other")
        data["patient"]["sex"] = ""
        with self.assertRaises(PayloadInvalid):
            mapper.build_form_obj(data)

    def test_dedicated_fields_default_to_none_reported_never_empty(self):
        form = mapper.build_form_obj(neutral())
        for key in ("selfReportedMeds", "allergies", "medicalConditions"):
            self.assertEqual(form[key], mapper.NONE_REPORTED)

    def test_lists_join_with_semicolons(self):
        form = mapper.build_form_obj(neutral(allergies=["Penicillin", "Latex"], self_reported_meds="Metformin"))
        self.assertEqual(form["allergies"], "Penicillin; Latex")
        self.assertEqual(form["selfReportedMeds"], "Metformin")

    def test_dedicated_keys_never_appear_in_question_answer_section(self):
        results = [
            {"question": "Allergies?", "answer": "Penicillin", "key": "allergies"},
            {"question": "Meds?", "answer": "Metformin", "key": "selfReportedMeds"},
            {"question": "Conditions?", "answer": "None", "key": "medicalConditions"},
            {"question": "Sleep?", "answer": "8"},
        ]
        form = mapper.build_form_obj(neutral(intake_results=results))
        self.assertEqual(form["Q1"], "Sleep?")
        self.assertNotIn("Q2", form)

    def test_multi_choice_question_includes_possible_answers(self):
        results = [{"question": "Symptoms?", "answer": ["a", "b"], "options": ["a", "b", "c"]}]
        form = mapper.build_form_obj(neutral(intake_results=results))
        self.assertEqual(form["Q1"], "Symptoms? POSSIBLE ANSWERS: a; b; c")
        self.assertEqual(form["A1"], "a; b")

    def test_unanswered_questions_are_skipped_not_sent_empty(self):
        form = mapper.build_form_obj(neutral(intake_results=[{"question": "Q", "answer": ""}, {"question": "Q2", "answer": "yes"}]))
        self.assertEqual(form["Q1"], "Q2")
        self.assertEqual(mapper.find_empty(form), [])

    def test_checkin_fields_are_strings(self):
        form = mapper.build_form_obj(neutral(titration="Increase", bmi=27, titration_level=2))
        self.assertEqual((form["titration"], form["BMI"], form["titrationLevel"]), ("Increase", "27", "2"))


class BuildVisitBodyTests(SimpleTestCase):
    def test_full_body_shape_and_optional_keys_omitted(self):
        body = mapper.build_visit_body(neutral(), master_id="m1", company="beema", visit_type="weightloss")
        self.assertEqual(set(body), {"formObj", "masterId", "company", "visitType"})
        self.assertEqual(mapper.find_empty(body), [])

    def test_pharmacy_and_verification_added_only_when_present(self):
        body = mapper.build_visit_body(
            neutral(verification_id="v1"), master_id="m1", company="beema", visit_type="weightloss", pharmacy_id="P9"
        )
        self.assertEqual(body["pharmacyId"], "P9")
        self.assertIs(body["patientVerified"], True)
        self.assertEqual(body["verificationId"], "v1")

    def test_missing_metadata_rejected(self):
        with self.assertRaises(PayloadInvalid) as ctx:
            mapper.build_visit_body(neutral(), master_id="", company="", visit_type="weightloss")
        self.assertEqual(ctx.exception.fields, ["company", "masterId"])

    def test_summary_has_no_phi(self):
        body = mapper.build_visit_body(neutral(), master_id="m1", company="beema", visit_type="weightloss")
        summary = mapper.summarize_visit_body(body)
        self.assertEqual(set(summary), {"masterId", "visitType", "form_field_count", "preference_count"})
        self.assertNotIn("Pat", str(summary))


class QuestionnaireConversionTests(SimpleTestCase):
    def payload(self):
        return {
            "patient": {"first_name": "Pat", "last_name": "Tester", "email": "p@example.com", "phone": "+15125550100",
                        "dob": "1985-03-09", "sex_at_birth": "female"},
            "location": {"state": "TX", "zip": "78701"},
            "body": {"height_in": 65, "weight_lbs": 200, "bmi": 33.3},
            "intake": {"medical": {
                "medications": {"none": False, "items": [{"name": "Metformin", "dose": "500mg", "frequency": "daily"}]},
                "allergies": {"none": True, "items": []},
                "condition_details": {"none": False, "items": [{"name": "Hypertension", "notes": "private note"}]},
                "conditions": ["gallbladder"],
                "medication_categories": ["none"],
                "allergy_categories": ["none"],
            }},
            "questions": [
                {"node": "sleep", "question": "How much sleep?", "answer": "7 hours"},
                {"node": "conditions", "question": "Conditions?", "answer": "Gallbladder disease"},
                {"node": "medications", "question": "Taking any?", "answer": "None of these"},
            ],
        }

    def test_converts_shape_and_routes_dedicated_nodes(self):
        out = mapper.neutral_from_questionnaire(self.payload())
        self.assertEqual(out["patient"]["sex"], "female")
        self.assertEqual(out["patient"]["state"], "TX")
        self.assertEqual(out["self_reported_meds"], ["Metformin 500mg daily"])
        self.assertEqual(out["allergies"], [])
        self.assertEqual(out["medical_conditions"], ["Hypertension", "Gallbladder disease"])
        questions = [r["question"] for r in out["intake_results"]]
        self.assertEqual(questions, ["How much sleep?", "Height (inches)", "Weight (lbs)", "BMI"])

    def test_notes_free_text_is_not_sent(self):
        self.assertNotIn("private note", str(mapper.neutral_from_questionnaire(self.payload())))
