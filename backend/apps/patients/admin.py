from django.contrib import admin

from apps.audit.mixins import AuditedAdminMixin

from .models import (
    Address,
    Allergy,
    ConsentRecord,
    DataRequest,
    EmergencyContact,
    IdentityDocument,
    MedicalCondition,
    PatientMedication,
    PatientProfile,
)

RO = ("id", "created_at", "updated_at")


class AddressInline(admin.TabularInline):
    model = Address
    extra = 0
    readonly_fields = RO


class EmergencyContactInline(admin.TabularInline):
    model = EmergencyContact
    extra = 0
    readonly_fields = RO


class AllergyInline(admin.TabularInline):
    model = Allergy
    extra = 0
    readonly_fields = RO


class MedicationInline(admin.TabularInline):
    model = PatientMedication
    extra = 0
    readonly_fields = RO


class ConditionInline(admin.TabularInline):
    model = MedicalCondition
    extra = 0
    readonly_fields = RO


class IdentityDocumentInline(admin.TabularInline):
    model = IdentityDocument
    extra = 0
    readonly_fields = RO


class DataRequestInline(admin.TabularInline):
    model = DataRequest
    extra = 0
    readonly_fields = RO


class ConsentInline(admin.TabularInline):
    """Consent records are immutable, so the inline is view only."""

    model = ConsentRecord
    extra = 0
    can_delete = False
    readonly_fields = ("id", "kind", "version", "accepted_at", "ip", "user_agent_hash", "created_at", "updated_at")

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PatientProfile)
class PatientProfileAdmin(AuditedAdminMixin, admin.ModelAdmin):
    list_display = ("id", "user", "date_of_birth", "sex_at_birth", "affiliate_ref", "created_at")
    list_filter = ("sex_at_birth", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name", "user__phone", "affiliate_ref")
    readonly_fields = RO
    autocomplete_fields = ("user",)
    inlines = [
        AddressInline,
        EmergencyContactInline,
        AllergyInline,
        MedicationInline,
        ConditionInline,
        IdentityDocumentInline,
        ConsentInline,
        DataRequestInline,
    ]


class _PatientChild(admin.ModelAdmin):
    readonly_fields = RO
    autocomplete_fields = ("patient",)


@admin.register(Address)
class AddressAdmin(_PatientChild):
    list_display = ("id", "patient", "kind", "city", "state", "zip_code", "is_default")
    list_filter = ("kind", "state", "is_default")
    search_fields = ("patient__user__email", "line1", "city", "zip_code")


@admin.register(EmergencyContact)
class EmergencyContactAdmin(_PatientChild):
    list_display = ("id", "patient", "relationship")
    list_filter = ("relationship",)
    search_fields = ("patient__user__email", "name", "phone")


@admin.register(Allergy)
class AllergyAdmin(AuditedAdminMixin, _PatientChild):
    list_display = ("id", "patient", "name", "severity")
    list_filter = ("severity",)
    search_fields = ("patient__user__email", "name")


@admin.register(PatientMedication)
class PatientMedicationAdmin(AuditedAdminMixin, _PatientChild):
    list_display = ("id", "patient", "name", "dose", "frequency", "is_current")
    list_filter = ("is_current",)
    search_fields = ("patient__user__email", "name")


@admin.register(MedicalCondition)
class MedicalConditionAdmin(AuditedAdminMixin, _PatientChild):
    list_display = ("id", "patient", "name", "diagnosed_on")
    list_filter = ("diagnosed_on",)
    search_fields = ("patient__user__email", "name")


@admin.register(IdentityDocument)
class IdentityDocumentAdmin(_PatientChild):
    list_display = ("id", "patient", "kind", "status", "verified_by", "verified_at")
    list_filter = ("kind", "status")
    search_fields = ("patient__user__email", "s3_key")


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    """Immutable: view only."""

    list_display = ("id", "patient", "kind", "version", "accepted_at")
    list_filter = ("kind", "version")
    search_fields = ("patient__user__email", "kind", "version")
    readonly_fields = ("id", "patient", "kind", "version", "accepted_at", "ip", "user_agent_hash", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DataRequest)
class DataRequestAdmin(_PatientChild):
    list_display = ("id", "patient", "kind", "status", "reviewed_by", "completed_at", "created_at")
    list_filter = ("kind", "status")
    search_fields = ("patient__user__email", "notes")
    autocomplete_fields = ("patient", "reviewed_by")
