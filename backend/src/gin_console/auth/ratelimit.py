"""Failed sign-ins over a sliding window, per key (REQ-AUTH-004)."""

from __future__ import annotations

import math
import threading
from collections import deque
from collections.abc import Callable
from datetime import datetime, timedelta


class FailureLimiter:
    """Counts failures per key in memory; a key with `limit` failures in the window is locked."""

    def __init__(self, clock: Callable[[], datetime], limit: int, window: float) -> None:
        self._clock = clock
        self._limit = limit
        self._window = timedelta(seconds=window)
        self._failures: dict[str, deque[datetime]] = {}
        self._lock = threading.Lock()

    def _prune(self, now: datetime) -> None:
        """Drop failures that left the window and keys left with none (lock held)."""
        for key in list(self._failures):
            times = self._failures[key]
            while times and times[0] + self._window <= now:
                times.popleft()
            if not times:
                del self._failures[key]

    def reserve(self, key: str) -> int | None:
        """Count one attempt of `key` now, before it is checked, so concurrent attempts cannot
        pass the limit; at the limit count nothing and return the whole seconds until the
        oldest failure leaves the window, at least 1."""
        with self._lock:
            now = self._clock()
            self._prune(now)
            times = self._failures.setdefault(key, deque())
            if len(times) < self._limit:
                times.append(now)
                return None
            return max(1, math.ceil((times[0] + self._window - now).total_seconds()))

    def release(self, key: str) -> None:
        """Take back one attempt of `key` that did not fail: the newest. A concurrent attempt
        may be newer, which only moves the end of a lock by that gap."""
        with self._lock:
            times = self._failures.get(key)
            if times:
                times.pop()
            if not times:
                self._failures.pop(key, None)

    def clear(self, key: str) -> None:
        with self._lock:
            self._prune(self._clock())
            self._failures.pop(key, None)
