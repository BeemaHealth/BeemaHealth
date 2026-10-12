"""Admin configuration for messaging models."""
from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html
from django.db.models import Q

from .models import Conversation, Message, Attachment, InternalNote, NotificationDelivery, AbandonedCheckout
from .services import staff_reply


class MessageInline(admin.TabularInline):
    """Inline messages for Conversation."""

    model = Message
    extra = 0
    readonly_fields = ("id", "direction", "sender_role", "sender_display_name", "created_at", "updated_at")
    fields = ("id", "direction", "sender_role", "sender_display_name", "body", "delivery_status", "attempts", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class AttachmentInline(admin.TabularInline):
    """Inline attachments for Message."""

    model = Attachment
    extra = 0
    readonly_fields = ("id", "s3_key", "mime", "size", "created_at")
    fields = ("id", "s3_key", "mime", "size")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class InternalNoteInline(admin.TabularInline):
    """Inline internal notes for Conversation."""

    model = InternalNote
    extra = 1
    readonly_fields = ("id", "author", "created_at", "updated_at")
    fields = ("author", "body", "created_at")
    can_delete = True

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        super().save_model(request, obj, form, change)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    """Admin for Conversation with lane filtering and quick actions."""

    list_display = ("conversation_id", "patient_link", "kind", "state", "assigned_to", "last_activity", "archive_status")
    list_filter = ("kind", "state", "archived", "created_at")
    search_fields = ("patient__user__email", "patient__user__first_name", "patient__user__last_name", "id")
    readonly_fields = ("id", "created_at", "updated_at", "patient_link", "treatment_link", "visit_link")
    fieldsets = (
        ("Conversation", {
            "fields": ("id", "patient_link", "kind", "state")
        }),
        ("Routing", {
            "fields": ("treatment_link", "visit_link", "assignee")
        }),
        ("Status", {
            "fields": ("archived", "unread_for_patient", "unread_for_staff", "last_message_at")
        }),
        ("Audit", {
            "fields": ("created_at", "updated_at")
        }),
    )
    inlines = [MessageInline, InternalNoteInline]
    actions = ("assign_to_me", "mark_archived", "mark_unread", "mark_read")

    def conversation_id(self, obj):
        return obj.id.hex[:8]

    conversation_id.short_description = "ID"

    def patient_link(self, obj):
        if obj.patient and obj.patient.user:
            user = obj.patient.user
            url = reverse("admin:accounts_user_change", args=[user.id])
            return format_html('<a href="{}">{}</a>', url, user.email)
        return "-"

    patient_link.short_description = "Patient"

    def treatment_link(self, obj):
        if obj.treatment:
            url = reverse("admin:clinical_treatment_change", args=[obj.treatment.id])
            return format_html('<a href="{}">{}</a>', url, obj.treatment.id.hex[:8])
        return "-"

    treatment_link.short_description = "Treatment"

    def visit_link(self, obj):
        if obj.visit:
            url = reverse("admin:clinical_visit_change", args=[obj.visit.id])
            return format_html('<a href="{}">{}</a>', url, obj.visit.id.hex[:8])
        return "-"

    visit_link.short_description = "Visit"

    def assigned_to(self, obj):
        if obj.assignee:
            return obj.assignee.get_full_name() or obj.assignee.email
        return "-"

    assigned_to.short_description = "Assigned"

    def last_activity(self, obj):
        if obj.last_message_at:
            return obj.last_message_at.strftime("%Y-%m-%d %H:%M")
        return "-"

    last_activity.short_description = "Last Activity"

    def archive_status(self, obj):
        color = "red" if not obj.archived else "green"
        status = "Archived" if obj.archived else "Active"
        return format_html('<span style="color: {};">{}</span>', color, status)

    archive_status.short_description = "Status"

    def get_search_results(self, request, queryset, search_term):
        """Custom search for patient email and IDs."""
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        if search_term:
            q_filter = Q(patient__user__email__icontains=search_term)
            queryset = queryset.filter(q_filter)
        return queryset, use_distinct

    def get_queryset(self, request):
        """Apply lane filters."""
        qs = super().get_queryset(request)
        lane = request.GET.get("lane")
        if lane == "active":
            qs = qs.filter(archived=False)
        elif lane == "awaiting_staff":
            qs = qs.filter(state="awaiting_staff", archived=False)
        elif lane == "awaiting_doctor":
            qs = qs.filter(state="awaiting_doctor", archived=False)
        elif lane == "your_inbox":
            qs = qs.filter(assignee=request.user, archived=False)
        elif lane == "unassigned":
            qs = qs.filter(assignee__isnull=True, archived=False, state__in=["awaiting_staff", "awaiting_doctor"])
        elif lane == "archived":
            qs = qs.filter(archived=True)
        return qs

    @admin.action(description="Assign to me")
    def assign_to_me(self, request, queryset):
        queryset.update(assignee=request.user)

    @admin.action(description="Archive")
    def mark_archived(self, request, queryset):
        queryset.update(archived=True)

    @admin.action(description="Mark unread")
    def mark_unread(self, request, queryset):
        queryset.update(unread_for_staff=True)

    @admin.action(description="Mark read")
    def mark_read(self, request, queryset):
        queryset.update(unread_for_staff=False)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Admin for Message (read-only, immutable)."""

    list_display = ("message_id", "conversation_link", "direction", "sender_role", "delivery_status", "created_at")
    list_filter = ("direction", "sender_role", "delivery_status", "created_at")
    search_fields = ("conversation__patient__user__email", "body", "external_id", "id")
    readonly_fields = ("id", "conversation_link", "direction", "sender_role", "sender_user", "body", "attempts", "created_at", "updated_at")

    def message_id(self, obj):
        return obj.id.hex[:8]

    message_id.short_description = "ID"

    def conversation_link(self, obj):
        url = reverse("admin:messaging_conversation_change", args=[obj.conversation.id])
        return format_html('<a href="{}">{}</a>', url, obj.conversation.id.hex[:8])

    conversation_link.short_description = "Conversation"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    """Admin for Attachment (read-only)."""

    list_display = ("attachment_id", "message_link", "mime", "size")
    list_filter = ("mime", "created_at")
    search_fields = ("s3_key", "message__id")
    readonly_fields = ("id", "message_link", "s3_key", "mime", "size", "created_at")

    def attachment_id(self, obj):
        return obj.id.hex[:8]

    attachment_id.short_description = "ID"

    def message_link(self, obj):
        url = reverse("admin:messaging_message_change", args=[obj.message.id])
        return format_html('<a href="{}">{}</a>', url, obj.message.id.hex[:8])

    message_link.short_description = "Message"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(InternalNote)
class InternalNoteAdmin(admin.ModelAdmin):
    """Admin for InternalNote."""

    list_display = ("note_id", "conversation_link", "author", "created_at")
    list_filter = ("author", "created_at")
    search_fields = ("conversation__patient__user__email", "body")
    readonly_fields = ("id", "conversation_link", "author", "created_at", "updated_at")

    def note_id(self, obj):
        return obj.id.hex[:8]

    note_id.short_description = "ID"

    def conversation_link(self, obj):
        url = reverse("admin:messaging_conversation_change", args=[obj.conversation.id])
        return format_html('<a href="{}">{}</a>', url, obj.conversation.id.hex[:8])

    conversation_link.short_description = "Conversation"


@admin.register(NotificationDelivery)
class NotificationDeliveryAdmin(admin.ModelAdmin):
    """Admin for NotificationDelivery (read-only)."""

    list_display = ("notification_id", "patient_link", "channel", "template_key", "status", "sent_at")
    list_filter = ("channel", "template_key", "status", "created_at")
    search_fields = ("patient__user__email", "provider_message_id")
    readonly_fields = ("id", "patient_link", "channel", "template_key", "status", "provider_message_id", "error", "sent_at", "created_at")

    def notification_id(self, obj):
        return obj.id.hex[:8]

    notification_id.short_description = "ID"

    def patient_link(self, obj):
        if obj.patient and obj.patient.user:
            url = reverse("admin:accounts_user_change", args=[obj.patient.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.patient.user.email)
        return "-"

    patient_link.short_description = "Patient"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AbandonedCheckout)
class AbandonedCheckoutAdmin(admin.ModelAdmin):
    """Admin for AbandonedCheckout tracking."""

    list_display = ("checkout_id", "patient_link", "email", "status", "emails_sent_count", "started_at")
    list_filter = ("completed_at", "stopped_at", "created_at")
    search_fields = ("patient__user__email", "email")
    readonly_fields = ("id", "patient_link", "started_at", "created_at", "updated_at")
    fieldsets = (
        ("Checkout", {
            "fields": ("id", "patient_link", "email", "submission")
        }),
        ("Timeline", {
            "fields": ("started_at", "reached_checkout_at", "completed_at", "stopped_at")
        }),
        ("Drip Status", {
            "fields": ("emails_sent",)
        }),
        ("Audit", {
            "fields": ("created_at", "updated_at")
        }),
    )

    def checkout_id(self, obj):
        return obj.id.hex[:8]

    checkout_id.short_description = "ID"

    def patient_link(self, obj):
        if obj.patient and obj.patient.user:
            url = reverse("admin:accounts_user_change", args=[obj.patient.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.patient.user.email)
        return "-"

    patient_link.short_description = "Patient"

    def emails_sent_count(self, obj):
        return len(obj.emails_sent) if obj.emails_sent else 0

    emails_sent_count.short_description = "Emails Sent"

    def status(self, obj):
        if obj.completed_at:
            return format_html('<span style="color: green;">Completed</span>')
        if obj.stopped_at:
            return format_html('<span style="color: orange;">Stopped</span>')
        return format_html('<span style="color: blue;">In Progress</span>')

    status.short_description = "Status"
