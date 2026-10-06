"""Document upload validation — filename and content type."""

from __future__ import annotations

import os
import re
import unicodedata

MAX_FILENAME_LEN = 255
MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

# Path separators, control chars, and characters unsafe in filenames / injection attempts.
_FORBIDDEN_CHARS_RE = re.compile(r"[\x00-\x1f\x7f\\/<>|`$;]")

_SCRIPT_INJECTION_TOKENS = ("../", "..\\", "%2e%2e", "<script", "javascript:")

ALLOWED_CONTENT_TYPES = frozenset(
    {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/heic",
        "image/heif",
        "image/webp",
        "application/octet-stream",
    }
)


def normalize_document_filename(filename: str) -> str:
    """Strip ends and map Unicode whitespace (e.g. U+202F in macOS screenshot names) to ASCII space."""
    text = str(filename).strip()
    normalized: list[str] = []
    for char in text:
        if char in "\t\n\r\f\v" or unicodedata.category(char) == "Zs":
            normalized.append(" ")
        else:
            normalized.append(char)
    return "".join(normalized).strip()


def validate_document_filename(filename: str) -> str | None:
    trimmed = normalize_document_filename(filename)
    if not trimmed:
        return "Filename is required."
    if len(trimmed) > MAX_FILENAME_LEN:
        return "Filename is too long."
    if trimmed != os.path.basename(trimmed):
        return "Filename must not include path segments."
    if ".." in trimmed:
        return "Filename contains invalid characters."
    if _FORBIDDEN_CHARS_RE.search(trimmed):
        return "Filename contains invalid characters."
    lower = trimmed.lower()
    if any(token in lower for token in _SCRIPT_INJECTION_TOKENS):
        return "Filename contains invalid characters."
    if trimmed in (".", ".."):
        return "Filename contains invalid characters."
    # Printable ASCII only — rejects other Unicode letters/symbols after whitespace normalization.
    if not re.fullmatch(r"[\x20-\x7e]+", trimmed):
        return "Filename contains invalid characters."
    return None


def validate_document_content_type(content_type: str) -> str | None:
    trimmed = str(content_type or "").strip().lower()
    if not trimmed:
        return "Content type is required."
    if len(trimmed) > 128:
        return "Content type is too long."
    if trimmed not in ALLOWED_CONTENT_TYPES:
        return "Unsupported file type."
    return None
