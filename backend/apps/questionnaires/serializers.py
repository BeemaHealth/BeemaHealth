import re

from rest_framework import serializers

from apps.questionnaires.models import (
    Experiment,
    ExperimentVariant,
    Medication,
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)

_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_]*$")
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
_HTML_TAG_RE = re.compile(r"<[^>]+>")

ALLOWED_RULE_KEYS = frozenset({"required", "min", "max", "min_length", "max_length", "pattern", "enum"})


def _strip_html(value: str) -> str:
    return _HTML_TAG_RE.sub("", str(value)).strip()


def _validate_key(value: str, field_name: str) -> str:
    value = str(value).strip()[:64]
    if not _KEY_RE.match(value):
        raise serializers.ValidationError(
            {field_name: "Must be lowercase alphanumeric + underscores, starting with a letter or digit."}
        )
    return value


def _validate_options(options) -> list:
    if not isinstance(options, list):
        raise serializers.ValidationError({"options": "Must be a list."})
    seen = set()
    cleaned = []
    for i, opt in enumerate(options):
        if not isinstance(opt, dict):
            raise serializers.ValidationError({"options": f"Item {i} must be an object."})
        value = str(opt.get("value", "")).strip()[:128]
        label = str(opt.get("label", "")).strip()[:256]
        if not value:
            raise serializers.ValidationError({"options": f"Item {i} missing 'value'."})
        if not label:
            raise serializers.ValidationError({"options": f"Item {i} missing 'label'."})
        if value in seen:
            raise serializers.ValidationError({"options": f"Duplicate value '{value}'."})
        seen.add(value)
        cleaned.append({"value": value, "label": label})
    return cleaned


def _validate_rules(rules) -> list:
    if not isinstance(rules, list):
        raise serializers.ValidationError({"validation_rules": "Must be a list."})
    cleaned = []
    for i, rule in enumerate(rules):
        if not isinstance(rule, dict):
            raise serializers.ValidationError({"validation_rules": f"Rule {i} must be an object."})
        rule_type = str(rule.get("type", "")).strip()
        if rule_type not in ALLOWED_RULE_KEYS:
            raise serializers.ValidationError(
                {"validation_rules": f"Rule {i} has unknown type '{rule_type}'. Allowed: {sorted(ALLOWED_RULE_KEYS)}."}
            )
        cleaned_rule: dict = {"type": rule_type}
        if "value" in rule:
            raw = rule["value"]
            if rule_type in {"min", "max", "min_length", "max_length"}:
                try:
                    cleaned_rule["value"] = float(raw)
                except (TypeError, ValueError):
                    raise serializers.ValidationError(
                        {"validation_rules": f"Rule {i} value must be numeric."}
                    )
            elif rule_type == "pattern":
                pattern = str(raw).strip()[:256]
                try:
                    re.compile(pattern)
                except re.error:
                    raise serializers.ValidationError(
                        {"validation_rules": f"Rule {i} pattern is not valid regex."}
                    )
                cleaned_rule["value"] = pattern
            elif rule_type == "enum":
                if not isinstance(raw, list):
                    raise serializers.ValidationError(
                        {"validation_rules": f"Rule {i} enum value must be a list."}
                    )
                cleaned_rule["value"] = [str(v)[:128] for v in raw[:100]]
            else:
                cleaned_rule["value"] = bool(raw)
        if "message" in rule:
            cleaned_rule["message"] = str(rule["message"]).strip()[:256]
        cleaned.append(cleaned_rule)
    return cleaned


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "id",
            "name",
            "slug",
            "drug_type",
            "delivery_type",
            "price_cents",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MedicationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ["name", "slug", "drug_type", "delivery_type", "price_cents", "active"]

    def validate_slug(self, value):
        value = str(value).strip().lower()
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError(
                "Must be lowercase alphanumeric, hyphens, or underscores."
            )
        return value

    def validate_name(self, value):
        return str(value).strip()[:128]

    def validate_price_cents(self, value):
        if value < 0:
            raise serializers.ValidationError("Must be non-negative.")
        return value


class QuestionnaireFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireField
        fields = [
            "id",
            "field_key",
            "field_type",
            "label",
            "help_text",
            "options",
            "validation_rules",
            "maps_to_section",
            "plugin_id",
            "sort_order",
            "required",
        ]
        read_only_fields = ["id"]


class QuestionnaireStepSerializer(serializers.ModelSerializer):
    fields = QuestionnaireFieldSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionnaireStep
        fields = [
            "id",
            "step_key",
            "sort_order",
            "title",
            "subtitle",
            "visibility_rule",
            "routing_rules",
            "position_x",
            "position_y",
            "fields",
        ]
        read_only_fields = ["id", "fields"]


class QuestionnaireVersionSerializer(serializers.ModelSerializer):
    questionnaire_slug = serializers.CharField(source="questionnaire.slug", read_only=True)
    questionnaire_type = serializers.CharField(source="questionnaire.questionnaire_type", read_only=True)
    medication_id = serializers.SerializerMethodField()
    steps = QuestionnaireStepSerializer(many=True, read_only=True)

    class Meta:
        model = QuestionnaireVersion
        fields = [
            "id",
            "questionnaire_slug",
            "questionnaire_type",
            "medication_id",
            "version_label",
            "status",
            "published_at",
            "steps",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "published_at", "created_at", "updated_at", "steps"]

    def get_medication_id(self, obj):
        mid = obj.questionnaire.medication_id
        return str(mid) if mid else None


class QuestionnaireListSerializer(serializers.ModelSerializer):
    published_version = serializers.SerializerMethodField()
    medication = MedicationSerializer(read_only=True)

    class Meta:
        model = Questionnaire
        fields = ["id", "slug", "questionnaire_type", "title", "medication", "published_version", "updated_at"]

    def get_published_version(self, obj):
        version = obj.versions.filter(status=QuestionnaireVersion.Status.PUBLISHED).first()
        if not version:
            return None
        return {"id": str(version.id), "version_label": version.version_label}


class QuestionnaireWriteSerializer(serializers.ModelSerializer):
    medication_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Questionnaire
        fields = ["slug", "questionnaire_type", "title", "medication_id"]

    def validate_slug(self, value):
        value = str(value).strip().lower()
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError(
                "Must be lowercase alphanumeric, hyphens, or underscores."
            )
        return value

    def validate_title(self, value):
        return str(value).strip()[:128]

    def validate(self, attrs):
        medication_id = attrs.pop("medication_id", None)
        if medication_id:
            try:
                attrs["medication"] = Medication.objects.get(id=medication_id)
            except Medication.DoesNotExist:
                raise serializers.ValidationError({"medication_id": "Medication not found."})
        else:
            attrs["medication"] = None
        return attrs


class QuestionnaireStepWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireStep
        fields = [
            "step_key",
            "sort_order",
            "title",
            "subtitle",
            "visibility_rule",
            "routing_rules",
            "position_x",
            "position_y",
        ]

    def validate_step_key(self, value):
        return _validate_key(value, "step_key")

    def validate_title(self, value):
        return _strip_html(value)[:256]

    def validate_subtitle(self, value):
        return _strip_html(value)[:1024]

    def validate_visibility_rule(self, value):
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("Must be an object or null.")
        allowed_ops = {"eq", "neq", "in", "nin", "gt", "gte", "lt", "lte"}
        when = value.get("when")
        if when:
            op = str(when.get("op", "")).strip()
            if op and op not in allowed_ops:
                raise serializers.ValidationError(f"Unknown op '{op}'. Allowed: {sorted(allowed_ops)}.")
            if "field" in when:
                when["field"] = str(when["field"]).strip()[:64]
        return value

    def validate_routing_rules(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list.")
        cleaned = []
        for i, rule in enumerate(value):
            if not isinstance(rule, dict):
                raise serializers.ValidationError(f"Rule {i} must be an object.")
            when_field = str(rule.get("when_field", "")).strip()[:64]
            when_value = str(rule.get("when_value", "")).strip()[:256]
            next_step_key = str(rule.get("next_step_key", "")).strip()[:64]
            if not when_field or not next_step_key:
                raise serializers.ValidationError(f"Rule {i} must have when_field and next_step_key.")
            cleaned.append({
                "when_field": when_field,
                "when_value": when_value,
                "next_step_key": next_step_key,
            })
        return cleaned


class QuestionnaireFieldWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireField
        fields = [
            "field_key",
            "field_type",
            "label",
            "help_text",
            "options",
            "validation_rules",
            "maps_to_section",
            "plugin_id",
            "sort_order",
            "required",
        ]

    def validate_field_key(self, value):
        return _validate_key(value, "field_key")

    def validate_label(self, value):
        return str(value).strip()[:256]

    def validate_help_text(self, value):
        return str(value).strip()[:1024]

    def validate_options(self, value):
        return _validate_options(value)

    def validate_validation_rules(self, value):
        return _validate_rules(value)

    def validate_maps_to_section(self, value):
        return str(value).strip()[:64]

    def validate_plugin_id(self, value):
        return str(value).strip()[:64]


class ExperimentVariantSerializer(serializers.ModelSerializer):
    questionnaire_version_id = serializers.UUIDField(source="questionnaire_version.id", read_only=True)
    version_label = serializers.CharField(source="questionnaire_version.version_label", read_only=True)

    class Meta:
        model = ExperimentVariant
        fields = ["id", "variant_key", "questionnaire_version_id", "version_label", "weight_percent"]
        read_only_fields = ["id"]


class ExperimentSerializer(serializers.ModelSerializer):
    questionnaire_slug = serializers.CharField(source="questionnaire.slug", read_only=True)
    variants = ExperimentVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Experiment
        fields = [
            "id",
            "name",
            "questionnaire_slug",
            "status",
            "start_at",
            "end_at",
            "variants",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "variants"]


class ExperimentWriteSerializer(serializers.ModelSerializer):
    questionnaire_slug = serializers.SlugField(write_only=True, required=False)

    class Meta:
        model = Experiment
        fields = ["name", "questionnaire", "questionnaire_slug", "status", "start_at", "end_at"]

    def validate(self, attrs):
        questionnaire = attrs.get("questionnaire")
        slug = attrs.pop("questionnaire_slug", None)
        if not questionnaire and slug:
            questionnaire = Questionnaire.objects.filter(slug=slug).first()
            if not questionnaire:
                raise serializers.ValidationError({"questionnaire_slug": "Unknown questionnaire."})
            attrs["questionnaire"] = questionnaire
        if not attrs.get("questionnaire"):
            raise serializers.ValidationError(
                {"questionnaire": "Questionnaire or questionnaire_slug is required."}
            )
        return attrs


class ExperimentVariantWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExperimentVariant
        fields = ["variant_key", "questionnaire_version", "weight_percent"]
