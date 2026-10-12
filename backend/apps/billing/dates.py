"""Calendar helpers."""
from __future__ import annotations

import calendar
from datetime import date


def add_months(day: date, months: int) -> date:
    """Add whole months, clamping the day to the end of shorter months."""
    index = day.month - 1 + months
    year = day.year + index // 12
    month = index % 12 + 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))
