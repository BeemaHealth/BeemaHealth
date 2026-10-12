"""Network (doctor network) adapter contract."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class VisitSubmitResult:
    ok: bool
    master_id: str = ""
    visit_id: str = ""
    error: str = ""
    status_code: int | None = None


@dataclass
class MessageSendResult:
    ok: bool
    error: str = ""
    status_code: int | None = None


@dataclass
class VisitSnapshot:
    """Neutral view of a vendor visit used by reconciliation. Holds no demographics."""

    master_id: str
    visit_status: str
    resolved_status: str = ""
    rx_history: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ParsedWebhook:
    event: str
    master_id: str
    order_id: str
    payload: dict[str, Any]


class NetworkAdapter(ABC):
    """A doctor network (visit review, prescribing, chat)."""

    vendor: str

    @abstractmethod
    def submit_visit(self, body: dict[str, Any], *, treatment: Any = None) -> VisitSubmitResult:
        """Create a visit at the network from an already mapped request body."""

    @abstractmethod
    def send_message(
        self, *, master_id: str, content: str, first_name: str, last_name: str, treatment: Any = None
    ) -> MessageSendResult:
        """Send a patient chat message to the doctor."""

    @abstractmethod
    def fetch_visit(self, master_id: str, *, treatment: Any = None) -> VisitSnapshot | None:
        """Fetch current visit state, or None when the vendor does not know the id."""

    @abstractmethod
    def parse_webhook(self, payload: dict[str, Any]) -> ParsedWebhook:
        """Validate and normalize an inbound webhook body."""

    @abstractmethod
    def capabilities(self) -> set[str]:
        """Feature names the network supports (e.g. ``chat``, ``fetch_visit``)."""
