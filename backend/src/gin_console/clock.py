"""The console's default clock."""

from datetime import UTC, datetime


def utc_now() -> datetime:
    return datetime.now(UTC)
