from django.contrib import admin

from apps.pharmacy.models import PharmacyOrder, PharmacyOrderEvent, PharmacyProductCatalog


@admin.register(PharmacyProductCatalog)
class PharmacyProductCatalogAdmin(admin.ModelAdmin):
    list_display = ("display_name", "offering_slug", "lf_product_id", "pharmacy_partner", "is_active")
    list_filter = ("pharmacy_partner", "is_active")
    search_fields = ("display_name", "offering_slug", "drug_name")


@admin.register(PharmacyOrder)
class PharmacyOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "pharmacy_partner", "status", "external_order_id", "submitted_at")
    list_filter = ("pharmacy_partner", "status")
    search_fields = ("external_order_id", "external_reference_id", "user__email")


@admin.register(PharmacyOrderEvent)
class PharmacyOrderEventAdmin(admin.ModelAdmin):
    list_display = ("id", "partner", "event_type", "status", "external_order_id", "created_at")
    list_filter = ("partner", "event_type")
