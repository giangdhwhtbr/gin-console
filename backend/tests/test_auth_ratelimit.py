from datetime import UTC, datetime, timedelta

from gin_console.auth.ratelimit import FailureLimiter

START = datetime(2026, 11, 27, 9, 0, tzinfo=UTC)


class Clock:
    """A list-backed fake clock: the last time is now."""

    def __init__(self) -> None:
        self.times = [START]

    def __call__(self) -> datetime:
        return self.times[-1]

    def advance(self, seconds: float) -> None:
        self.times.append(self.times[-1] + timedelta(seconds=seconds))


def limiter(clock: Clock, limit: int = 5, window: float = 900) -> FailureLimiter:
    return FailureLimiter(clock, limit, window)


# REQ-AUTH-004 (Username locked)
def test_auth_004_locks_at_the_limit() -> None:
    clock = Clock()
    limits = limiter(clock)
    for _ in range(5):
        assert limits.reserve("an") is None  # counted
    assert limits.reserve("an") == 900  # refused, and not counted


# REQ-AUTH-004: Retry-After counts down to the oldest failure leaving the window
def test_auth_004_retry_after_counts_down() -> None:
    clock = Clock()
    limits = limiter(clock)
    for _ in range(5):
        limits.reserve("an")
        clock.advance(10)
    # failures at 0, 10, 20, 30, 40; now is 50
    assert limits.reserve("an") == 850
    clock.advance(849.5)
    assert limits.reserve("an") == 1  # whole seconds, at least 1
    clock.advance(0.5)
    assert limits.reserve("an") is None


# REQ-AUTH-004 (Window passes)
def test_auth_004_window_passes() -> None:
    clock = Clock()
    limits = limiter(clock)
    for _ in range(5):
        limits.reserve("an")
    clock.advance(900)
    for _ in range(5):
        assert limits.reserve("an") is None
    assert limits.reserve("an") is not None


# REQ-AUTH-004 (Success resets the user)
def test_auth_004_clear_resets() -> None:
    clock = Clock()
    limits = limiter(clock)
    for _ in range(4):
        limits.reserve("an")
    limits.clear("an")
    for _ in range(5):
        assert limits.reserve("an") is None


# REQ-AUTH-004: a release takes back one attempt, the newest
def test_auth_004_release_takes_back_one() -> None:
    clock = Clock()
    limits = limiter(clock, limit=2)
    limits.reserve("an")
    clock.advance(100)
    limits.reserve("an")
    limits.release("an")  # the attempt at 100
    assert limits.reserve("an") is None
    assert limits.reserve("an") == 800  # the one at 0 is still the oldest
    limits.release("nobody")  # nothing to take back


# REQ-AUTH-004 (IP locked): keys are independent
def test_auth_004_keys_are_independent() -> None:
    clock = Clock()
    limits = limiter(clock, limit=2)
    limits.reserve("10.0.0.1")
    limits.reserve("10.0.0.1")
    assert limits.reserve("10.0.0.1") is not None
    limits.clear("10.0.0.2")
    assert limits.reserve("10.0.0.2") is None
    assert limits.reserve("10.0.0.1") is not None


# REQ-AUTH-004: keys without failures in the window are pruned (memory stays bounded,
# so the test reads the private table)
def test_auth_004_empty_keys_pruned() -> None:
    clock = Clock()
    limits = limiter(clock)
    limits.reserve("an")
    limits.reserve("bo")
    assert len(limits._failures) == 2
    clock.advance(900)
    limits.reserve("cy")  # every call drops old times
    assert len(limits._failures) == 1
    limits.reserve("dy")
    limits.release("dy")
    assert len(limits._failures) == 1
    limits.clear("cy")
    assert len(limits._failures) == 0
