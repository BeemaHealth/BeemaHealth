from django.apps import AppConfig


class RoutingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.routing"

    def ready(self) -> None:
        """Register the routing loader with the catalog definition loader when it exists."""
        try:
            from apps.catalog.loader import register_loader
        except ImportError:
            return
        from .loader import load_routing_definitions

        register_loader("routing", load_routing_definitions)
