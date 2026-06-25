from django.urls import path

from apps.analytics.staff_views import (
    StaffAnalyticsDropoffView,
    StaffAnalyticsFunnelView,
    StaffAnalyticsLandingPagePerformanceView,
    StaffAnalyticsPageViewsView,
    StaffAnalyticsTimelineView,
    StaffAnalyticsTrafficView,
    StaffLandingPageDetailView,
    StaffLandingPageListView,
)

urlpatterns = [
    path("funnel/", StaffAnalyticsFunnelView.as_view(), name="staff-analytics-funnel"),
    path("dropoff/", StaffAnalyticsDropoffView.as_view(), name="staff-analytics-dropoff"),
    path("timeline/", StaffAnalyticsTimelineView.as_view(), name="staff-analytics-timeline"),
    path("traffic/", StaffAnalyticsTrafficView.as_view(), name="staff-analytics-traffic"),
    path("landing-pages-performance/", StaffAnalyticsLandingPagePerformanceView.as_view(), name="staff-analytics-lp-perf"),
    path("page-views/", StaffAnalyticsPageViewsView.as_view(), name="staff-analytics-page-views"),
    path("landing-pages/", StaffLandingPageListView.as_view(), name="staff-landing-page-list"),
    path("landing-pages/<uuid:page_id>/", StaffLandingPageDetailView.as_view(), name="staff-landing-page-detail"),
]
