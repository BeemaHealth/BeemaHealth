from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ConversationViewSet

app_name = "messaging"

router = DefaultRouter()
router.register(r"conversations", ConversationViewSet, basename="conversation")

urlpatterns = router.urls
