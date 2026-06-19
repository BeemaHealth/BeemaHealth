from django.test import TestCase

from apps.common.validation.documents import (
    normalize_document_filename,
    validate_document_content_type,
    validate_document_filename,
)
from apps.common.validation.payloads import COMMAND_INJECTION, OVERFLOW, PATH_TRAVERSAL, XSS_PAYLOADS


class DocumentValidationTests(TestCase):
    def test_accepts_macos_screenshot_filename_with_regular_spaces(self):
        name = "Screenshot 2026-06-11 at 9.42.31 AM.png"
        self.assertIsNone(validate_document_filename(name))
        self.assertEqual(normalize_document_filename(name), name)

    def test_accepts_macos_screenshot_filename_with_narrow_no_break_space(self):
        name = "Screenshot 2026-06-11 at 9.42.31\u202fAM.png"
        self.assertIsNone(validate_document_filename(name))
        self.assertEqual(
            normalize_document_filename(name),
            "Screenshot 2026-06-11 at 9.42.31 AM.png",
        )

    def test_accepts_multiple_dots_and_common_punctuation(self):
        for name in (
            "lab.results.v2.pdf",
            "My Report (final).png",
            "insurance_card-front.jpg",
        ):
            with self.subTest(name=name):
                self.assertIsNone(validate_document_filename(name))

    def test_rejects_path_traversal_and_xss(self):
        for payload in XSS_PAYLOADS + PATH_TRAVERSAL + OVERFLOW + COMMAND_INJECTION:
            with self.subTest(payload=payload[:80]):
                self.assertIsNotNone(validate_document_filename(payload))

    def test_rejects_empty_filename(self):
        self.assertEqual(validate_document_filename(""), "Filename is required.")

    def test_accepts_png_content_type(self):
        self.assertIsNone(validate_document_content_type("image/png"))

    def test_rejects_html_content_type(self):
        self.assertEqual(
            validate_document_content_type("text/html"),
            "Unsupported file type.",
        )
