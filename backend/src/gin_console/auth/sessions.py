"""In-memory sessions; a restart signs everyone out (REQ-AUTH-002, REQ-AUTH-006, REQ-AUTH-016)."""

from __future__ import annotations

import secrets
import threading
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta

_TOKEN_BYTES = 32


@dataclass(frozen=True)
class Session:
    token: str  # the cookie value
    grant: str  # the id of the mockup folder grants; never accepted as a cookie
    grant_key: bytes  # signs the mockup folder grants; never leaves the server
    name: str
    created: datetime


class SessionStore:
    def __init__(self, clock: Callable[[], datetime], ttl: float) -> None:
        self._clock = clock
        self._ttl = timedelta(seconds=ttl)
        self._by_token: dict[str, Session] = {}
        self._token_by_grant: dict[str, str] = {}
        self._lock = threading.Lock()

    def create(self, name: str) -> Session:
        session = Session(
            token=secrets.token_urlsafe(_TOKEN_BYTES),
            grant=secrets.token_urlsafe(_TOKEN_BYTES),
            grant_key=secrets.token_bytes(_TOKEN_BYTES),
            name=name,
            created=self._clock(),
        )
        with self._lock:
            for token in list(self._by_token):  # drop expired sessions nobody asked for again
                self._live(token)
            self._by_token[session.token] = session
            self._token_by_grant[session.grant] = session.token
        return session

    def _live(self, token: str) -> Session | None:
        """The session of `token`, dropped when its TTL has passed (lock held)."""
        session = self._by_token.get(token)
        if session is None:
            return None
        if session.created + self._ttl <= self._clock():
            self._drop(session)
            return None
        return session

    def _drop(self, session: Session) -> None:
        self._by_token.pop(session.token, None)
        self._token_by_grant.pop(session.grant, None)

    def get(self, token: str) -> Session | None:
        with self._lock:
            return self._live(token)

    def by_grant(self, grant: str) -> Session | None:
        with self._lock:
            token = self._token_by_grant.get(grant)
            return None if token is None else self._live(token)

    def end(self, token: str) -> None:
        with self._lock:
            session = self._by_token.get(token)
            if session is not None:
                self._drop(session)

    def end_users(self, names: Iterable[str]) -> None:
        ended = set(names)
        with self._lock:
            for session in [s for s in self._by_token.values() if s.name in ended]:
                self._drop(session)
