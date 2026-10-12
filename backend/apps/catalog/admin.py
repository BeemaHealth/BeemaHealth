"""Admin configuration for catalog models."""
from django.contrib import admin

from apps.catalog.models import (
    Plan,
    PlanPhase,
    PlanPrice,
    PriceOverride,
    Product,
    ProductVariant,
    VariantMapping,
)


class ProductVariantInline(admin.TabularInline):
    """Inline editor for ProductVariant within Product admin."""

    model = ProductVariant
    extra = 1
    fields = ["slug", "drug", "additive", "phase", "strength_mg", "form", "is_active"]
    readonly_fields = ["id", "created_at", "updated_at"]


class PlanInline(admin.TabularInline):
    """Inline editor for Plan within Product admin."""

    model = Plan
    extra = 1
    fields = [
        "slug",
        "name",
        "kind",
        "term_months",
        "billing_commitment",
        "bill_interval_months",
        "ship_interval_months",
        "is_active",
    ]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin for products."""

    list_display = ["id", "name", "slug", "category", "routing_mode", "is_active", "created_at"]
    list_filter = ["category", "routing_mode", "is_active", "created_at"]
    search_fields = ["name", "slug", "neutral_label"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [ProductVariantInline, PlanInline]
    fieldsets = (
        (
            "Product Info",
            {
                "fields": ["id", "slug", "name", "category", "neutral_label", "questionnaire_slug"],
            },
        ),
        (
            "Settings",
            {
                "fields": ["routing_mode", "requires_ineligibility_check", "is_active"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at"],
            },
        ),
    )


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    """Admin for product variants."""

    list_display = ["id", "slug", "product", "drug", "additive", "phase", "strength_mg", "is_active"]
    list_filter = ["product", "drug", "additive", "phase", "is_active"]
    search_fields = ["slug", "drug", "product__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        (
            "Variant Info",
            {
                "fields": ["id", "slug", "product", "drug", "additive", "phase"],
            },
        ),
        (
            "Details",
            {
                "fields": ["strength_mg", "form", "is_active"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at"],
            },
        ),
    )


@admin.register(VariantMapping)
class VariantMappingAdmin(admin.ModelAdmin):
    """Admin for variant mappings to vendor SKUs."""

    list_display = ["id", "variant", "organization", "vendor_sku"]
    list_filter = ["organization", "created_at"]
    search_fields = ["variant__slug", "organization__slug", "vendor_sku"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        (
            "Mapping",
            {
                "fields": ["id", "variant", "organization", "vendor_sku"],
            },
        ),
        (
            "Notes",
            {
                "fields": ["notes"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at"],
            },
        ),
    )


class PlanPriceInline(admin.TabularInline):
    """Inline editor for PlanPrice within Plan admin."""

    model = PlanPrice
    extra = 1
    fields = ["amount_cents", "effective_from", "effective_to", "currency"]
    readonly_fields = ["id", "created_at", "updated_at"]


class PlanPhaseInline(admin.TabularInline):
    """Inline editor for PlanPhase within Plan admin."""

    model = PlanPhase
    extra = 1
    fields = ["sequence", "start_month", "variant", "dose_interval_days"]
    readonly_fields = ["id", "created_at", "updated_at"]


class PriceOverrideInline(admin.TabularInline):
    """Inline editor for PriceOverride within Plan admin."""

    model = PriceOverride
    extra = 1
    fields = ["patient", "amount_cents", "reason", "expires_at", "is_active"]
    readonly_fields = ["id", "created_by", "created_at", "updated_at"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    """Admin for plans."""

    list_display = [
        "id",
        "slug",
        "product",
        "name",
        "kind",
        "term_months",
        "billing_commitment",
        "is_active",
    ]
    list_filter = ["product", "kind", "billing_commitment", "is_active", "created_at"]
    search_fields = ["slug", "name", "product__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    inlines = [PlanPriceInline, PlanPhaseInline, PriceOverrideInline]
    fieldsets = (
        (
            "Plan Info",
            {
                "fields": ["id", "slug", "product", "variant", "name", "kind"],
            },
        ),
        (
            "Billing",
            {
                "fields": [
                    "term_months",
                    "billing_commitment",
                    "bill_interval_months",
                    "ship_interval_months",
                    "supply_days_per_shipment",
                ],
            },
        ),
        (
            "Settings",
            {
                "fields": ["allows_coupons", "stackable_with_term_discount", "renews_at_term_end_default", "is_active"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at"],
            },
        ),
    )


@admin.register(PlanPrice)
class PlanPriceAdmin(admin.ModelAdmin):
    """Admin for plan prices."""

    list_display = ["id", "plan", "amount_cents", "effective_from", "effective_to", "currency"]
    list_filter = ["plan", "currency", "effective_from"]
    search_fields = ["plan__slug"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        (
            "Price Info",
            {
                "fields": ["id", "plan", "amount_cents", "currency"],
            },
        ),
        (
            "Effective Period",
            {
                "fields": ["effective_from", "effective_to"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at"],
            },
        ),
    )


@admin.register(PlanPhase)
class PlanPhaseAdmin(admin.ModelAdmin):
    """Admin for plan phases."""

    list_display = ["id", "plan", "sequence", "start_month", "variant", "dose_interval_days"]
    list_filter = ["plan", "created_at"]
    search_fields = ["plan__slug"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fieldsets = (
        (
            "Phase Info",
            {
                "fields": ["id", "plan", "sequence", "start_month"],
            },
        ),
        (
            "Details",
            {
                "fields": ["variant", "dose_interval_days"],
            },
        ),
        (
            "Timestamps",
            {
                "fields": ["created_at", "updated_at"],
            },
        ),
    )


@admin.register(PriceOverride)
class PriceOverrideAdmin(admin.ModelAdmin):
    """Admin for price overrides. Append-only and audited."""

    list_display = ["id", "plan", "patient", "amount_cents", "reason", "is_active", "created_at"]
    list_filter = ["plan", "is_active", "created_at"]
    search_fields = ["plan__slug", "patient__user__email", "reason"]
    readonly_fields = ["id", "created_by", "created_at", "updated_at"]
    fieldsets = (
        (
            "Override Info",
            {
                "fields": ["id", "plan", "patient", "amount_cents", "reason"],
            },
        ),
        (
            "Validity",
            {
                "fields": ["is_active", "expires_at"],
            },
        ),
        (
            "Audit",
            {
                "fields": ["created_by", "created_at", "updated_at"],
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        """Set created_by to current user."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
