from django.urls import path

from apps.analytics.staff_views import (
    StaffAnalyticsDropoffView,
    StaffAnalyticsFunnelView,
    StaffAnalyticsTimelineView,
)

urlpatterns = [
    path("funnel/", StaffAnalyticsFunnelView.as_view(), name="staff-analytics-funnel"),
    path("dropoff/", StaffAnalyticsDropoffView.as_view(), name="staff-analytics-dropoff"),
    path("timeline/", StaffAnalyticsTimelineView.as_view(), name="staff-analytics-timeline"),
]
