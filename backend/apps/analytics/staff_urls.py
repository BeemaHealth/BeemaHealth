from django.urls import path

from apps.analytics.staff_views import (
    StaffAnalyticsDropoffView,
    StaffAnalyticsFunnelView,
    StaffAnalyticsLandingPagePerformanceView,
    StaffAnalyticsPageViewsView,
    StaffAnalyticsTimelineView,
    StaffAnalyticsTopOfFunnelView,
    StaffAnalyticsTrafficView,
    StaffAnalyticsVersionsView,
    StaffLandingPageDetailView,
    StaffLandingPageListView,
)

urlpatterns = [
    path("funnel/", StaffAnalyticsFunnelView.as_view(), name="staff-analytics-funnel"),
    path("dropoff/", StaffAnalyticsDropoffView.as_view(), name="staff-analytics-dropoff"),
    path("versions/", StaffAnalyticsVersionsView.as_view(), name="staff-analytics-versions"),
    path("timeline/", StaffAnalyticsTimelineView.as_view(), name="staff-analytics-timeline"),
    path("traffic/", StaffAnalyticsTrafficView.as_view(), name="staff-analytics-traffic"),
    path("landing-pages-performance/", StaffAnalyticsLandingPagePerformanceView.as_view(), name="staff-analytics-lp-perf"),
    path("page-views/", StaffAnalyticsPageViewsView.as_view(), name="staff-analytics-page-views"),
    path("top-of-funnel/", StaffAnalyticsTopOfFunnelView.as_view(), name="staff-analytics-top-of-funnel"),
    path("landing-pages/", StaffLandingPageListView.as_view(), name="staff-landing-page-list"),
    path("landing-pages/<uuid:page_id>/", StaffLandingPageDetailView.as_view(), name="staff-landing-page-detail"),
]
