"""Shared exception types. Messages must never contain PHI."""


class DecryptionError(Exception):
    """A stored encrypted value could not be decrypted (wrong key or tampered data)."""


class InvalidStateTransition(Exception):
    """A state machine rejected a requested transition."""
