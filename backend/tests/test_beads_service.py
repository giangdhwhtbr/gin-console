import threading
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import pytest

from gin_console.beads.service import KeyedCache

START = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now


def counting(delay: float = 0.0, fail: bool = False) -> tuple[Callable[[], int], list[int]]:
    runs: list[int] = []

    def fetch() -> int:
        runs.append(1)
        if delay:
            time.sleep(delay)
        if fail:
            raise RuntimeError("boom")
        return len(runs)

    return fetch, runs


# REQ-BEADS-004
def test_beads_004_reused_then_expired() -> None:
    clock = Clock()
    cache = KeyedCache[str, int](timedelta(seconds=5), clock)
    fetch, runs = counting()
    assert cache.get("k", fetch) == 1
    clock.now += timedelta(seconds=2)
    assert cache.get("k", fetch) == 1 and len(runs) == 1
    clock.now += timedelta(seconds=4)  # 6 s after the first fetch
    assert cache.get("k", fetch) == 2 and len(runs) == 2


# REQ-BEADS-004
def test_beads_004_each_key_has_its_own_entry() -> None:
    cache = KeyedCache[str, int](timedelta(seconds=5), Clock())
    fetch, runs = counting()
    cache.get("open", fetch)
    cache.get("closed", fetch)
    assert len(runs) == 2


# REQ-BEADS-004
def test_beads_004_overlapping_requests_for_a_key_run_once() -> None:
    cache = KeyedCache[str, int](timedelta(seconds=5), Clock())
    fetch, runs = counting(delay=0.2)
    threads = [threading.Thread(target=cache.get, args=("k", fetch)) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(runs) == 1


# REQ-BEADS-004
def test_beads_004_errors_are_not_kept() -> None:
    cache = KeyedCache[str, int](timedelta(seconds=5), Clock())
    fetch, runs = counting(fail=True)
    for _ in range(2):
        with pytest.raises(RuntimeError):
            cache.get("k", fetch)
    assert len(runs) == 2
