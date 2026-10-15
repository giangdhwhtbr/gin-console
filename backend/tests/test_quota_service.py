import threading
import time
from datetime import UTC, datetime, timedelta

from gin_console.quota.models import QuotaError
from gin_console.quota.service import CachedSide
from gin_console.quota.source import SourceError

START = datetime(2026, 10, 15, 3, 0, tzinfo=UTC)


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **delta: float) -> None:
        self.now += timedelta(**delta)


def side(
    clock: Clock, fail: bool = False, delay: float = 0.0
) -> tuple[CachedSide[datetime], list[int]]:
    runs: list[int] = []

    def fetch(now: datetime) -> datetime:
        runs.append(1)
        if delay:
            time.sleep(delay)
        if fail:
            raise SourceError("boom")
        return now

    return CachedSide(fetch, clock), runs


# REQ-QUOTA-006
def test_quota_006_reused_within_five_minutes() -> None:
    clock = Clock()
    cached, runs = side(clock)
    first = cached.get(False)
    clock.advance(minutes=2)
    assert cached.get(False) == first
    assert len(runs) == 1


# REQ-QUOTA-006
def test_quota_006_expired_after_five_minutes() -> None:
    clock = Clock()
    cached, runs = side(clock)
    cached.get(False)
    clock.advance(minutes=6)
    assert cached.get(False) == START + timedelta(minutes=6)
    assert len(runs) == 2


# REQ-QUOTA-006
def test_quota_006_forced_refresh_and_too_soon() -> None:
    clock = Clock()
    cached, runs = side(clock)
    cached.get(False)
    clock.advance(seconds=10)
    cached.get(True)
    assert len(runs) == 1  # too soon
    clock.advance(seconds=30)
    cached.get(True)
    assert len(runs) == 2


# REQ-QUOTA-006
def test_quota_006_errors_are_not_kept() -> None:
    clock = Clock()
    cached, runs = side(clock, fail=True)
    first = cached.get(False)
    assert isinstance(first, QuotaError) and first.error == "boom"
    cached.get(False)
    assert len(runs) == 2


# REQ-QUOTA-006
def test_quota_006_overlapping_requests_run_once() -> None:
    clock = Clock()
    cached, runs = side(clock, delay=0.2)
    threads = [threading.Thread(target=cached.get, args=(False,)) for _ in range(3)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(runs) == 1


# REQ-QUOTA-001
def test_quota_001_unexpected_exception_is_confined_to_its_side() -> None:
    def fetch(now: datetime) -> datetime:
        raise ZeroDivisionError

    result = CachedSide(fetch, Clock()).get(False)
    assert isinstance(result, QuotaError) and "ZeroDivisionError" in result.error
