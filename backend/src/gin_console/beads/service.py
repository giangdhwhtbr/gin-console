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
        self._locks: dict[K, threading.Lock] = {}
        self._items: dict[K, tuple[datetime, T]] = {}

    def clear(self) -> None:
        with self._guard:
            self._items = {}

    def lock_count(self) -> int:
        return len(self._locks)

    def get(self, key: K, fetch: Callable[[], T]) -> T:
        with self._guard:
            lock = self._locks.setdefault(key, threading.Lock())
            if len(self._locks) > MAX_ENTRIES:
                # drop locks nobody holds for keys with no stored result (unknown ids pile up);
                # a lock dropped just before its thread takes it only allows one duplicate fetch
                self._locks = {
                    k: v
                    for k, v in self._locks.items()
                    if k == key or k in self._items or v.locked()
                }
        with lock:
            hit = self._items.get(key)
            # a clock that steps back makes the age negative: treat that as expired
            if hit is not None and timedelta(0) <= self._clock() - hit[0] < self._ttl:
                return hit[1]
            value = fetch()  # an exception propagates and nothing is stored
            stored_at = self._clock()  # timed from the end: a slow fetch must not expire at once
            with self._guard:
                if len(self._items) >= MAX_ENTRIES:
                    self._items = {
                        k: v
                        for k, v in self._items.items()
                        if timedelta(0) <= stored_at - v[0] < self._ttl
                    }
                self._items[key] = (stored_at, value)
            return value
