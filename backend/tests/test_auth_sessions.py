from datetime import UTC, datetime, timedelta

from gin_console.auth.sessions import SessionStore

START = datetime(2026, 11, 27, 9, 0, tzinfo=UTC)


class Clock:
    """A list-backed fake clock: the last time is now."""

    def __init__(self) -> None:
        self.times = [START]

    def __call__(self) -> datetime:
        return self.times[-1]

    def advance(self, seconds: float) -> None:
        self.times.append(self.times[-1] + timedelta(seconds=seconds))


# REQ-AUTH-002, REQ-AUTH-016: tokens of at least 32 bytes, a grant that is not the token
def test_auth_002_create() -> None:
    store = SessionStore(Clock(), ttl=43200)
    session = store.create("an")
    assert (session.name, session.created) == ("an", START)
    assert len(session.token) >= 43 and len(session.grant) >= 43  # 32 bytes, base64
    assert session.token != session.grant
    assert store.create("an").token != session.token
    assert store.get(session.token) == session


# REQ-AUTH-016: each session holds its own secret grant key of 32 random bytes
def test_auth_016_grant_key() -> None:
    store = SessionStore(Clock(), ttl=43200)
    session, other = store.create("an"), store.create("an")
    assert len(session.grant_key) == 32
    assert session.grant_key != other.grant_key
    assert session.grant_key not in (session.token.encode(), session.grant.encode())


# REQ-AUTH-016: a repr of a session, as a log line would show it, holds no secret
def test_auth_016_repr_hides_secrets() -> None:
    session = SessionStore(Clock(), ttl=43200).create("an")
    text = repr(session)
    assert "an" in text
    assert session.token not in text
    assert repr(session.grant_key) not in text and "grant_key" not in text


# REQ-AUTH-006 (Expired): a session ends at created + ttl
def test_auth_006_expires_at_ttl() -> None:
    clock = Clock()
    store = SessionStore(clock, ttl=43200)
    session = store.create("an")
    clock.advance(43199)
    assert store.get(session.token) == session
    assert store.by_grant(session.grant) == session
    clock.advance(1)
    assert store.get(session.token) is None
    assert store.by_grant(session.grant) is None


# REQ-AUTH-006: an expired session is dropped, not revived by a clock going back
def test_auth_006_expired_is_dropped() -> None:
    clock = Clock()
    store = SessionStore(clock, ttl=300)
    session = store.create("an")
    clock.advance(300)
    assert store.get(session.token) is None
    clock.times.append(START)
    assert store.get(session.token) is None
    assert store.by_grant(session.grant) is None


# REQ-AUTH-006 (Sign out)
def test_auth_006_end() -> None:
    store = SessionStore(Clock(), ttl=43200)
    session = store.create("an")
    other = store.create("an")
    store.end(session.token)
    assert store.get(session.token) is None
    assert store.by_grant(session.grant) is None
    assert store.get(other.token) == other
    store.end(session.token)  # ending twice is harmless
    store.end("no-such-token")


# REQ-AUTH-006, REQ-AUTH-009: removed or reset users lose their sessions
def test_auth_006_end_users() -> None:
    store = SessionStore(Clock(), ttl=43200)
    an, an_again, bo, root = (store.create(n) for n in ("an", "an", "bo", "root"))
    store.end_users({"an", "bo"})
    assert [store.get(s.token) for s in (an, an_again, bo)] == [None, None, None]
    assert store.by_grant(an.grant) is None
    assert store.get(root.token) == root
    store.end_users([])


# REQ-AUTH-016 (Grant is not a session)
def test_auth_016_grant_is_not_a_token() -> None:
    store = SessionStore(Clock(), ttl=43200)
    session = store.create("an")
    assert store.get(session.grant) is None
    assert store.by_grant(session.token) is None
    assert store.by_grant(session.grant) == session


# REQ-AUTH-006: expired sessions do not pile up in memory (reads the private table)
def test_auth_006_create_drops_expired() -> None:
    clock = Clock()
    store = SessionStore(clock, ttl=300)
    store.create("an")
    clock.advance(300)
    fresh = store.create("bo")
    assert list(store._by_token) == [fresh.token]
    assert list(store._token_by_grant) == [fresh.grant]
