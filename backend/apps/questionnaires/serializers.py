import re

from rest_framework import serializers

from apps.questionnaires.models import (
    ApiVendor,
    ApiVendorVersion,
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
        beluga = str(opt.get("beluga", "")).strip()[:64]
        if beluga and not _BELUGA_MAPPING_RE.match(beluga):
            raise serializers.ValidationError(
                {"options": f"Item {i} has invalid beluga mapping '{beluga}'."}
            )
        seen.add(value)
        row = {"value": value, "label": label}
        if beluga:
            row["beluga"] = beluga
        cleaned.append(row)
    return cleaned


_ACCOUNT_SUB_FIELD_KEYS = frozenset(
    {"first_name", "last_name", "phone", "email", "password", "confirm_password"}
)
_ADDRESS_SUB_FIELD_KEYS = frozenset(
    {"address", "city", "state", "zip", "county", "country", "verified"}
)
_BACKEND_MAPPING_RE = re.compile(
    r"^(register\.(first_name|last_name|email|phone|password)|user\.(first_name|last_name|email|phone|state))$"
)
_ADDRESS_BACKEND_MAPPING_RE = re.compile(
    r"^(intake\.identity\.(address|city|state|zip|county|country|address_verified)|"
    r"intake\.medication_preferences\.(shipping_address|shipping_city|shipping_state|"
    r"shipping_zip|shipping_county|shipping_country|shipping_address_verified|"
    r"use_different_shipping_address)|user\.state)$"
)
_BELUGA_MAPPING_RE = re.compile(
    r"^beluga:(firstName|lastName|dob|phone|email|address|city|state|zip|sex|"
    r"selfReportedMeds|allergies|medicalConditions|consentsSigned)$"
)


def _validate_account_options(options) -> list:
    if not isinstance(options, list):
        raise serializers.ValidationError({"options": "Must be a list."})
    seen = set()
    cleaned = []
    for i, opt in enumerate(options):
        if not isinstance(opt, dict):
            raise serializers.ValidationError({"options": f"Item {i} must be an object."})
        value = str(opt.get("value", "")).strip()[:128]
        label = str(opt.get("label", "")).strip()[:256]
        backend = str(opt.get("backend", "")).strip()[:64]
        beluga = str(opt.get("beluga", "")).strip()[:64]
        if not value:
            raise serializers.ValidationError({"options": f"Item {i} missing 'value'."})
        if value not in _ACCOUNT_SUB_FIELD_KEYS:
            raise serializers.ValidationError(
                {"options": f"Item {i} has unknown account sub-field '{value}'."}
            )
        if not label:
            raise serializers.ValidationError({"options": f"Item {i} missing 'label'."})
        if value in seen:
            raise serializers.ValidationError({"options": f"Duplicate value '{value}'."})
        if backend and not _BACKEND_MAPPING_RE.match(backend):
            raise serializers.ValidationError(
                {"options": f"Item {i} has invalid backend mapping '{backend}'."}
            )
        if beluga and not _BELUGA_MAPPING_RE.match(beluga):
            raise serializers.ValidationError(
                {"options": f"Item {i} has invalid beluga mapping '{beluga}'."}
            )
        seen.add(value)
        cleaned.append(
            {"value": value, "label": label, "backend": backend, "beluga": beluga}
        )
    return cleaned


def _validate_address_options(options) -> list:
    if not isinstance(options, list):
        raise serializers.ValidationError({"options": "Must be a list."})
    seen = set()
    cleaned = []
    for i, opt in enumerate(options):
        if not isinstance(opt, dict):
            raise serializers.ValidationError({"options": f"Item {i} must be an object."})
        value = str(opt.get("value", "")).strip()[:128]
        label = str(opt.get("label", "")).strip()[:256]
        backend = str(opt.get("backend", "")).strip()[:64]
        beluga = str(opt.get("beluga", "")).strip()[:64]
        if not value:
            raise serializers.ValidationError({"options": f"Item {i} missing 'value'."})
        if value not in _ADDRESS_SUB_FIELD_KEYS:
            raise serializers.ValidationError(
                {"options": f"Item {i} has unknown address sub-field '{value}'."}
            )
        if not label:
            raise serializers.ValidationError({"options": f"Item {i} missing 'label'."})
        if value in seen:
            raise serializers.ValidationError({"options": f"Duplicate value '{value}'."})
        if backend and not _ADDRESS_BACKEND_MAPPING_RE.match(backend):
            raise serializers.ValidationError(
                {"options": f"Item {i} has invalid backend mapping '{backend}'."}
            )
        if beluga and not _BELUGA_MAPPING_RE.match(beluga):
            raise serializers.ValidationError(
                {"options": f"Item {i} has invalid beluga mapping '{beluga}'."}
            )
        seen.add(value)
        cleaned.append(
            {"value": value, "label": label, "backend": backend, "beluga": beluga}
        )
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


class ApiVendorVersionSerializer(serializers.ModelSerializer):
    vendor_slug = serializers.CharField(source="vendor.slug", read_only=True)
    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    display_label = serializers.CharField(read_only=True)

    class Meta:
        model = ApiVendorVersion
        fields = [
            "id",
            "vendor_slug",
            "vendor_name",
            "version_number",
            "label",
            "display_label",
            "schema",
            "status",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "vendor_slug", "vendor_name", "display_label", "version_number", "published_at", "created_at", "updated_at"]


class ApiVendorVersionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiVendorVersion
        fields = ["label", "schema"]

    def validate_schema(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Schema must be an object.")
        fields = value.get("fields")
        if not isinstance(fields, list):
            raise serializers.ValidationError('Schema must have a "fields" array.')
        for i, f in enumerate(fields):
            if not isinstance(f, dict) or not f.get("id") or not f.get("label"):
                raise serializers.ValidationError(
                    f'Field at index {i} must have "id" and "label".'
                )
        return value


class ApiVendorSerializer(serializers.ModelSerializer):
    versions = ApiVendorVersionSerializer(many=True, read_only=True)
    latest_published_version = serializers.SerializerMethodField()

    class Meta:
        model = ApiVendor
        fields = ["id", "slug", "name", "description", "active", "latest_published_version", "versions", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_latest_published_version(self, obj):
        v = obj.versions.filter(status=ApiVendorVersion.Status.PUBLISHED).order_by("-version_number").first()
        if not v:
            return None
        return {"id": str(v.id), "version_number": v.version_number, "display_label": v.display_label}


class ApiVendorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiVendor
        fields = ["slug", "name", "description", "active"]

    def validate_slug(self, value):
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError("Slug must be lowercase alphanumeric with hyphens/underscores.")
        return value


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
            "progress_level",
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
    is_in_use = serializers.SerializerMethodField()
    vendor_version_id = serializers.UUIDField(source="vendor_version.id", read_only=True, allow_null=True, default=None)
    vendor_version_info = serializers.SerializerMethodField()

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
            "is_in_use",
            "vendor_version_id",
            "vendor_version_info",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "published_at", "created_at", "updated_at", "steps", "is_in_use", "vendor_version_id", "vendor_version_info"]

    def get_medication_id(self, obj):
        mid = obj.questionnaire.medication_id
        return str(mid) if mid else None

    def get_is_in_use(self, obj):
        from apps.questionnaires.services import questionnaire_version_is_in_use

        return questionnaire_version_is_in_use(obj.id)

    def get_vendor_version_info(self, obj):
        vv = obj.vendor_version
        if not vv:
            return None
        return {
            "id": str(vv.id),
            "vendor_slug": vv.vendor.slug,
            "vendor_name": vv.vendor.name,
            "display_label": vv.display_label,
            "schema": vv.schema,
        }


class QuestionnaireListSerializer(serializers.ModelSerializer):
    published_version = serializers.SerializerMethodField()
    medication = MedicationSerializer(read_only=True)

    class Meta:
        model = Questionnaire
        fields = ["id", "slug", "questionnaire_type", "title", "medication", "published_version", "updated_at"]

    def get_published_version(self, obj):
        version = (
            obj.versions.filter(status=QuestionnaireVersion.Status.PUBLISHED)
            .select_related("vendor_version__vendor")
            .order_by("-published_at")
            .first()
        )
        if not version:
            return None
        vv = version.vendor_version
        return {
            "id": str(version.id),
            "version_label": version.version_label,
            "vendor_name": vv.vendor.name if vv else None,
            "vendor_display_label": vv.display_label if vv else None,
        }


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
        qs = Questionnaire.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A questionnaire with this slug already exists."
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


class QuestionnaireUpdateSerializer(serializers.ModelSerializer):
    """Partial update for an existing questionnaire (slug and title only)."""

    class Meta:
        model = Questionnaire
        fields = ["slug", "title"]

    def validate_slug(self, value):
        value = str(value).strip().lower()
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError(
                "Must be lowercase alphanumeric, hyphens, or underscores."
            )
        qs = Questionnaire.objects.filter(slug=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A questionnaire with this slug already exists."
            )
        return value

    def validate_title(self, value):
        cleaned = str(value).strip()[:128]
        if not cleaned:
            raise serializers.ValidationError("Title cannot be empty.")
        return cleaned


class QuestionnaireDuplicateSerializer(serializers.Serializer):
    slug = serializers.CharField(required=False, allow_blank=True, max_length=64)
    title = serializers.CharField(required=False, allow_blank=True, max_length=128)

    def validate_slug(self, value):
        if not value or not str(value).strip():
            return ""
        value = str(value).strip().lower()
        if not _SLUG_RE.match(value):
            raise serializers.ValidationError(
                "Must be lowercase alphanumeric, hyphens, or underscores."
            )
        if Questionnaire.objects.filter(slug=value).exists():
            raise serializers.ValidationError(
                "A questionnaire with this slug already exists."
            )
        return value

    def validate_title(self, value):
        if not value or not str(value).strip():
            return ""
        return str(value).strip()[:128]


class QuestionnaireStepWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireStep
        fields = [
            "step_key",
            "sort_order",
            "progress_level",
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
            if not when_field:
                raise serializers.ValidationError(f"Rule {i} must have when_field.")
            # __default__ with an empty next_step_key is the "no default flow" sentinel.
            if not next_step_key and when_field != "__default__":
                raise serializers.ValidationError(f"Rule {i} must have next_step_key.")
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
        return value

    def validate(self, attrs):
        field_type = attrs.get("field_type")
        if field_type is None and self.instance is not None:
            field_type = self.instance.field_type
        options = attrs.get("options")
        if options is not None:
            if field_type == QuestionnaireField.FieldType.ACCOUNT:
                attrs["options"] = _validate_account_options(options)
            elif field_type == QuestionnaireField.FieldType.ADDRESS_GROUP:
                attrs["options"] = _validate_address_options(options)
            else:
                attrs["options"] = _validate_options(options)
        return attrs

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
