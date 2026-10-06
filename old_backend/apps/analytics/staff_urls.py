from django.urls import path

from apps.analytics.staff_views import (
    StaffAnalyticsCtaView,
    StaffAnalyticsDropoffView,
    StaffAnalyticsFunnelView,
    StaffAnalyticsLandingPagePerformanceView,
    StaffAnalyticsPageViewsView,
    StaffAnalyticsSlugsView,
    StaffAnalyticsStepAnalyticsView,
    StaffAnalyticsTimelineView,
    StaffAnalyticsTopOfFunnelView,
    StaffAnalyticsTrafficView,
    StaffAnalyticsVersionsView,
    StaffAnalyticsVersionsListView,
    StaffLandingPageDetailView,
    StaffLandingPageListView,
)

urlpatterns = [
    path("funnel/", StaffAnalyticsFunnelView.as_view(), name="staff-analytics-funnel"),
    path("dropoff/", StaffAnalyticsDropoffView.as_view(), name="staff-analytics-dropoff"),
    path("versions/", StaffAnalyticsVersionsView.as_view(), name="staff-analytics-versions"),
    path("versions-list/", StaffAnalyticsVersionsListView.as_view(), name="staff-analytics-versions-list"),
    path("slugs/", StaffAnalyticsSlugsView.as_view(), name="staff-analytics-slugs"),
    path("cta-performance/", StaffAnalyticsCtaView.as_view(), name="staff-analytics-cta"),
    path("timeline/", StaffAnalyticsTimelineView.as_view(), name="staff-analytics-timeline"),
    path("traffic/", StaffAnalyticsTrafficView.as_view(), name="staff-analytics-traffic"),
    path("landing-pages-performance/", StaffAnalyticsLandingPagePerformanceView.as_view(), name="staff-analytics-lp-perf"),
    path("page-views/", StaffAnalyticsPageViewsView.as_view(), name="staff-analytics-page-views"),
    path("top-of-funnel/", StaffAnalyticsTopOfFunnelView.as_view(), name="staff-analytics-top-of-funnel"),
    path("step-analytics/", StaffAnalyticsStepAnalyticsView.as_view(), name="staff-analytics-step-analytics"),
    path("landing-pages/", StaffLandingPageListView.as_view(), name="staff-landing-page-list"),
    path("landing-pages/<uuid:page_id>/", StaffLandingPageDetailView.as_view(), name="staff-landing-page-detail"),
]
