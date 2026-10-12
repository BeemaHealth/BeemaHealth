from contextlib import contextmanager
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase

from apps.clinical import hooks


def _missing(path):
    raise ModuleNotFoundError(name=path.rsplit(".", 1)[0])


@contextmanager
def patched_import(**kwargs):
    """Replace only the importlib reference inside hooks, not the global import machinery."""
    with mock.patch("apps.clinical.hooks.importlib") as fake:
        fake.import_module.configure_mock(**kwargs)
        yield fake


class HookTests(SimpleTestCase):
    def treatment(self):
        return SimpleNamespace(pk="t1", patient=SimpleNamespace(pk="p1"))

    def test_missing_app_is_skipped(self):
        with patched_import(side_effect=_missing):
            self.assertIsNone(hooks.refund_not_prescribed(self.treatment()))
            self.assertIsNone(hooks.refund_canceled_before_submission(self.treatment()))
            hooks.record_event(treatment=self.treatment(), source="system", event="x")
            hooks.notify_patient(SimpleNamespace(pk="p"), "rx_written")
            hooks.submit_visit(self.treatment())
            hooks.audit_log(None, "read")

    def test_broken_dependency_inside_app_is_not_hidden(self):
        with patched_import(side_effect=ModuleNotFoundError(name="stripe")):
            with self.assertRaises(ModuleNotFoundError):
                hooks.refund_not_prescribed(self.treatment())

    def test_refund_is_delegated_and_errors_propagate(self):
        module = mock.Mock()
        with patched_import(return_value=module):
            t = self.treatment()
            hooks.refund_not_prescribed(t)
            module.refund_not_prescribed.assert_called_once_with(t)
            module.refund_canceled_before_submission.side_effect = RuntimeError("x")
            with self.assertRaises(RuntimeError):
                hooks.refund_canceled_before_submission(t)

    def test_record_event_and_notify_swallow_errors(self):
        module = mock.Mock()
        module.record_event.side_effect = RuntimeError("x")
        module.notify_patient.side_effect = RuntimeError("x")
        module.submit_visit_for_treatment.side_effect = RuntimeError("x")
        with patched_import(return_value=module):
            with self.assertLogs("apps.clinical.hooks", level="ERROR"):
                hooks.record_event(treatment=self.treatment(), source="system", event="x")
                hooks.notify_patient(SimpleNamespace(pk="p"), "rx_written")
                hooks.submit_visit(self.treatment())

    def test_record_event_passes_patient_and_payload(self):
        module = mock.Mock()
        t = self.treatment()
        with patched_import(return_value=module):
            hooks.record_event(treatment=t, source="staff", event="treatment.active", payload={"a": 1})
        module.record_event.assert_called_once_with(
            treatment=t, patient=t.patient, source="staff", event="treatment.active", payload={"a": 1}
        )

    def test_notify_skipped_when_messaging_lacks_function(self):
        module = mock.Mock(spec=[])
        with patched_import(return_value=module):
            hooks.notify_patient(SimpleNamespace(pk="p"), "rx_written")
