"""UTC Datetime utility helpers."""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Returns current datetime in UTC timezone."""
    return datetime.now(timezone.utc)


def format_iso(dt: datetime) -> str:
    """Formats datetime object to ISO 8601 string standard."""
    return dt.isoformat()
