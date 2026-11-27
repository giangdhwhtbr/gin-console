"""Who is signed in, and which projects a request may see (REQ-AUTH-005 to 009, 016)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime

from fastapi import Request

from gin_console.auth.ratelimit import FailureLimiter
from gin_console.auth.sessions import Session, SessionStore
from gin_console.auth.users import User, UserDirectory, load_users
from gin_console.config import ProjectEntry, Settings

COOKIE = "gin_console_session"


class AuthState:
    """The users file, the sessions and the sign-in limiters of one app."""

    def __init__(self, settings: Settings, clock: Callable[[], datetime]) -> None:
        auth = settings.auth
        names = [p.name for p in settings.projects]
        self.enabled = auth.enabled
        self.session_ttl = auth.session_ttl
        users = load_users(auth.users_file, names) if auth.enabled else {}
        self._directory = UserDirectory(auth.users_file, names, users)
        self.sessions = SessionStore(clock, auth.session_ttl)
        limits = auth.rate_limit
        self.per_user = FailureLimiter(clock, limits.per_user, limits.window)
        self.per_ip = FailureLimiter(clock, limits.per_ip, limits.window)

    def users(self) -> dict[str, User]:
        """The current users; reading them ends the sessions of users removed or given a new
        password since the last read (REQ-AUTH-009)."""
        users, changed = self._directory.current()
        if changed:
            self.sessions.end_users(changed)
        return users

    def _user_of(self, find: Callable[[str], Session | None], key: str | None) -> User | None:
        if not key:
            return None
        users = self.users()  # first, so a changed user's session has ended
        session = find(key)
        return None if session is None else users.get(session.name)

    def user_of_token(self, token: str | None) -> User | None:
        return self._user_of(self.sessions.get, token)

    def user_of_grant(self, grant: str) -> User | None:
        return self._user_of(self.sessions.by_grant, grant)


ProjectsOf = Callable[[Request], list[ProjectEntry]]


def allowed_projects(settings: Settings, user: User) -> list[ProjectEntry]:
    """The projects `user` may see, in config order."""
    return [entry for entry in settings.projects if user.allows(entry.name)]


def projects_of(settings: Settings) -> ProjectsOf:
    """The projects a request may see: every one while auth is off, else the signed-in user's
    (none without a user). The routers resolve a project only among these (REQ-AUTH-007)."""
    if not settings.auth.enabled:
        return lambda _request: settings.projects

    def of(request: Request) -> list[ProjectEntry]:
        user: User | None = getattr(request.state, "user", None)
        return [] if user is None else allowed_projects(settings, user)

    return of


def via_grant(request: Request, grant: str) -> bool:
    """True when the middleware let this request in by `grant` (REQ-AUTH-016)."""
    return bool(getattr(request.state, "grant", None) == grant)
