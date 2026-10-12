from django.apps import AppConfig


class QuestionnairesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.questionnaires"

    def ready(self) -> None:
        try:
            from apps.catalog.loader import register_loader
        except ImportError:
            return
        from .loader import load_questionnaire_definitions

        register_loader("questionnaires", load_questionnaire_definitions)
