import threading
from collections.abc import Callable, Hashable
from datetime import datetime, timedelta

MAX_ENTRIES = 256


class KeyedCache[K: Hashable, T]:
    """Reuse a successful result per key; one fetch per key at a time; errors are not kept."""

    def __init__(self, ttl: timedelta, clock: Callable[[], datetime]) -> None:
        self._ttl = ttl
        self._clock = clock
        self._guard = threading.Lock()
        # simplified: one lock per key ever asked for; bounded by the beads viewed,
        # cleared on restart
        self._locks: dict[K, threading.Lock] = {}
        self._items: dict[K, tuple[datetime, T]] = {}

    def get(self, key: K, fetch: Callable[[], T]) -> T:
        with self._guard:
            lock = self._locks.setdefault(key, threading.Lock())
        with lock:
            now = self._clock()
            hit = self._items.get(key)
            if hit is not None and now - hit[0] < self._ttl:
                return hit[1]
            value = fetch()  # an exception propagates and nothing is stored
            with self._guard:
                if len(self._items) >= MAX_ENTRIES:
                    self._items = {k: v for k, v in self._items.items() if now - v[0] < self._ttl}
                self._items[key] = (now, value)
            return value
