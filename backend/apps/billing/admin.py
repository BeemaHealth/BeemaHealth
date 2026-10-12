from __future__ import annotations

from django.contrib import admin, messages

from . import margins, services
from .models import (
    AffiliateAttribution,
    AffiliateLink,
    Coupon,
    CouponRedemption,
    Invoice,
    InvoiceLine,
    Refund,
    StoreCreditEntry,
    Subscription,
    VendorCost,
)

BASE_READONLY = ("id", "created_at", "updated_at")


def _dollars(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    return f"{sign}${abs(cents) / 100:,.2f}"


class InvoiceInline(admin.TabularInline):
    model = Invoice
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ("id", "kind", "status", "total_cents", "refunded_cents", "paid_at", "period_start")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None) -> bool:
        return False


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    fields = ("description_internal", "neutral_description", "amount_cents", "plan", "product")
    raw_id_fields = ("plan", "product")


class RefundInline(admin.TabularInline):
    model = Refund
    extra = 0
    fields = ("amount_cents", "reason", "status", "scope_key", "stripe_refund_id", "approved_by", "created_at")
    readonly_fields = ("status", "scope_key", "stripe_refund_id", "created_at")
    raw_id_fields = ("approved_by",)


class VendorCostInline(admin.TabularInline):
    model = VendorCost
    extra = 0
    fields = ("kind", "vendor", "amount_cents", "incurred_at", "treatment", "notes")
    raw_id_fields = ("treatment", "vendor")


class RedemptionInline(admin.TabularInline):
    model = CouponRedemption
    extra = 0
    fields = ("patient", "invoice", "amount_cents", "released_at", "created_at")
    readonly_fields = fields
    can_delete = False

    def has_add_permission(self, request, obj=None) -> bool:
        return False


class AttributionInline(admin.TabularInline):
    model = AffiliateAttribution
    extra = 0
    raw_id_fields = ("patient",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "plan", "status", "commitment", "term_ends_on", "next_bill_on", "renews_at_term_end")
    list_filter = ("status", "commitment", "renews_at_term_end", "cancel_requested")
    search_fields = ("id", "patient__user__email", "stripe_customer_id", "stripe_subscription_id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patient", "treatment", "plan")
    inlines = [InvoiceInline]
    date_hierarchy = "created_at"


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "kind", "status", "total_dollars", "refunded_dollars", "margin", "paid_at", "disputed_at")
    list_filter = ("status", "kind", "disputed_at")
    search_fields = ("id", "patient__user__email", "stripe_payment_intent_id", "stripe_invoice_id")
    readonly_fields = BASE_READONLY + ("refunded_cents", "net_paid", "vendor_costs_total", "margin")
    raw_id_fields = ("patient", "subscription", "treatment")
    inlines = [InvoiceLineInline, RefundInline, VendorCostInline]
    date_hierarchy = "created_at"

    def has_delete_permission(self, request, obj=None) -> bool:
        """A paid invoice is a financial record; void or refund it instead of deleting."""
        if obj is not None and obj.paid_at is not None:
            return False
        return super().has_delete_permission(request, obj)

    @admin.display(description="Total")
    def total_dollars(self, obj: Invoice) -> str:
        return _dollars(obj.total_cents)

    @admin.display(description="Refunded")
    def refunded_dollars(self, obj: Invoice) -> str:
        return _dollars(obj.refunded_cents)

    @admin.display(description="Net paid")
    def net_paid(self, obj: Invoice) -> str:
        return _dollars(obj.net_paid_cents)

    @admin.display(description="Vendor costs")
    def vendor_costs_total(self, obj: Invoice) -> str:
        return _dollars(margins.invoice_vendor_cost_cents(obj))

    @admin.display(description="Margin")
    def margin(self, obj: Invoice) -> str:
        return _dollars(margins.invoice_margin_cents(obj))


@admin.register(InvoiceLine)
class InvoiceLineAdmin(admin.ModelAdmin):
    list_display = ("id", "invoice", "description_internal", "amount_cents")
    search_fields = ("id", "description_internal", "neutral_description", "invoice__id")
    list_filter = ("product",)
    readonly_fields = BASE_READONLY
    raw_id_fields = ("invoice", "plan", "product")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "kind", "value", "stackable", "first_order_only", "global_cap", "per_patient_cap", "redemptions", "is_active", "ends_at")
    list_filter = ("kind", "is_active", "stackable", "first_order_only", "excludes_starter_pack")
    search_fields = ("code", "name")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patients", "affiliate")
    filter_horizontal = ("products",)
    inlines = [RedemptionInline]

    @admin.display(description="Live redemptions")
    def redemptions(self, obj: Coupon) -> int:
        return obj.redemptions.filter(released_at__isnull=True).count()


@admin.register(CouponRedemption)
class CouponRedemptionAdmin(admin.ModelAdmin):
    list_display = ("id", "coupon", "patient", "invoice", "amount_cents", "released_at", "created_at")
    list_filter = ("coupon",)
    search_fields = ("id", "coupon__code", "patient__user__email")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("coupon", "patient", "invoice")


@admin.register(AffiliateLink)
class AffiliateLinkAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "coupon", "is_active")
    list_filter = ("is_active",)
    search_fields = ("slug", "name")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("coupon",)
    inlines = [AttributionInline]


@admin.register(AffiliateAttribution)
class AffiliateAttributionAdmin(admin.ModelAdmin):
    list_display = ("id", "affiliate", "patient", "source", "first_touch_at")
    list_filter = ("affiliate",)
    search_fields = ("id", "affiliate__slug", "patient__user__email", "source")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("affiliate", "patient")


@admin.register(StoreCreditEntry)
class StoreCreditEntryAdmin(admin.ModelAdmin):
    """Append only: add a compensating entry rather than editing one."""

    list_display = ("id", "patient", "delta_cents", "reason", "invoice", "created_by", "created_at")
    list_filter = ("reason",)
    search_fields = ("id", "patient__user__email", "reason")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("patient", "invoice", "created_by")

    def get_readonly_fields(self, request, obj=None):
        if obj is not None:
            return tuple(f.name for f in self.model._meta.fields)
        return self.readonly_fields

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    def save_model(self, request, obj, form, change) -> None:
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ("id", "invoice", "amount_cents", "reason", "status", "approved_by", "created_at")
    list_filter = ("status", "reason")
    search_fields = ("id", "invoice__id", "stripe_refund_id", "invoice__patient__user__email")
    readonly_fields = BASE_READONLY + ("status", "stripe_refund_id", "scope_key")
    raw_id_fields = ("invoice", "approved_by")
    actions = ["retry_failed"]

    def get_readonly_fields(self, request, obj=None):
        """An issued refund is a ledger row mirroring Stripe: only the note stays editable."""
        if obj is not None:
            return tuple(f.name for f in self.model._meta.fields if f.name != "note")
        return self.readonly_fields

    def has_delete_permission(self, request, obj=None) -> bool:
        return False

    @admin.action(description="Retry failed refunds")
    def retry_failed(self, request, queryset) -> None:
        for refund in queryset.filter(status=Refund.Status.FAILED):
            result = services.retry_failed_refund(refund)
            level = messages.SUCCESS if result.status == Refund.Status.SUCCEEDED else messages.ERROR
            self.message_user(request, f"Refund {refund.pk}: {result.status}", level)

    def save_model(self, request, obj, form, change) -> None:
        """Creating a refund in admin goes through the service so Stripe and the caps apply."""
        if change:
            super().save_model(request, obj, form, change)
            return
        try:
            services.refund_invoice(obj.invoice, obj.amount_cents, obj.reason, approved_by=request.user, note=obj.note)
        except Exception as exc:  # noqa: BLE001 - show the reason to staff instead of a 500
            self.message_user(request, f"Refund not issued: {exc}", messages.ERROR)


@admin.register(VendorCost)
class VendorCostAdmin(admin.ModelAdmin):
    """Margin = what the patient paid net of refunds minus vendor costs, per invoice and per patient."""

    list_display = ("id", "treatment", "vendor", "kind", "cost", "incurred_at", "invoice", "invoice_margin", "patient_margin")
    list_filter = ("kind", "vendor", "incurred_at")
    search_fields = ("id", "notes", "treatment__patient__user__email", "invoice__id")
    readonly_fields = BASE_READONLY
    raw_id_fields = ("treatment", "order", "vendor", "invoice")
    date_hierarchy = "incurred_at"

    @admin.display(description="Cost")
    def cost(self, obj: VendorCost) -> str:
        return _dollars(obj.amount_cents)

    @admin.display(description="Invoice margin")
    def invoice_margin(self, obj: VendorCost) -> str:
        return _dollars(margins.invoice_margin_cents(obj.invoice)) if obj.invoice_id else "-"

    @admin.display(description="Patient margin")
    def patient_margin(self, obj: VendorCost) -> str:
        return _dollars(margins.patient_margin_cents(obj.treatment.patient))
