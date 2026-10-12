from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.fulfillment import services
from apps.integrations.tests.helpers import make_graph, make_subscription


class ReleaseBatchesCommandTests(TestCase):
    def test_releases_due_batches_and_reports(self):
        _, treatment, _ = make_graph(status="active")
        sub = make_subscription(treatment, term=3)
        services.create_batches(sub)
        out = StringIO()
        call_command("release_batches", stdout=out)
        self.assertIn("released=1", out.getvalue())
