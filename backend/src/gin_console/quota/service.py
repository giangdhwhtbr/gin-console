import threading
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from gin_console.quota.models import QuotaError
from gin_console.quota.source import SourceError, clean

TTL = timedelta(minutes=5)
MIN_REFRESH = timedelta(seconds=30)


def utc_now() -> datetime:
    return datetime.now(UTC)


class CachedSide[T]:
    """One side of the quota: runs `fetch` under a lock and reuses a successful result."""

    def __init__(self, fetch: Callable[[datetime], T], clock: Callable[[], datetime]) -> None:
        self._fetch = fetch
        self._clock = clock
        self._lock = threading.Lock()
        self._value: T | None = None
        self._at: datetime | None = None

    def get(self, refresh: bool) -> T | QuotaError:
        with self._lock:
            now = self._clock()
            if self._value is not None and self._at is not None:
                age = now - self._at
                if age < MIN_REFRESH or (age < TTL and not refresh):
                    return self._value
            try:
                value = self._fetch(now)
            except SourceError as exc:
                return QuotaError(error=str(exc), raw=exc.raw)
            except Exception as exc:  # noqa: BLE001  # isolation boundary: one side must not take the other down
                return QuotaError(error=clean(f"unexpected error: {type(exc).__name__}"))
            self._value, self._at = value, now
            return value
