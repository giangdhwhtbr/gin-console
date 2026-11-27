"""Who is signed in, and which projects a request may see (REQ-AUTH-005 to 009, 016)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import threading
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
        # over a reload and the end of its sessions, so no request between them uses one
        self._reload = threading.Lock()
        self.sessions = SessionStore(clock, auth.session_ttl)
        limits = auth.rate_limit
        self.per_user = FailureLimiter(clock, limits.per_user, limits.window)
        self.per_ip = FailureLimiter(clock, limits.per_ip, limits.window)

    def users(self) -> dict[str, User]:
        """The current users; reading them ends the sessions of users removed or given a new
        password since the last read (REQ-AUTH-009)."""
        with self._reload:
            return self._current()

    def _current(self) -> dict[str, User]:
        """The users, after ending the sessions of the changed ones (`_reload` held)."""
        users, changed = self._directory.current()
        if changed:
            self.sessions.end_users(changed)
        return users

    def start_session(self, user: User) -> Session | None:
        """A session for `user`, verified against `user.password_hash`; None when the users
        file has since removed the user or changed that hash, so a sign-in checked against
        an old password cannot outlive a reset in flight (REQ-AUTH-009)."""
        with self._reload:
            current = self._current().get(user.name)
            if current is None or current.password_hash != user.password_hash:
                return None
            return self.sessions.create(user.name)

    def session_of_token(self, token: str | None) -> Session | None:
        if not token:
            return None
        self.users()  # first, so a changed user's session has ended
        return self.sessions.get(token)

    def user_of_folder_grant(
        self, token: str, project: str, capability: str, date: str
    ) -> User | None:
        """The user of a live session whose grant of this mockup folder is `token`, while the
        user may see `project`; None for any other token, also a malformed one (REQ-AUTH-016)."""
        grant_id, _, mac = token.rpartition(".")
        if not grant_id or not mac or not token.isascii():  # compare_digest takes ASCII text
            return None
        users = self.users()  # first, so a changed user's session has ended
        session = self.sessions.by_grant(grant_id)
        if session is None:
            return None
        if not hmac.compare_digest(token, folder_grant(session, project, capability, date)):
            return None
        user = users.get(session.name)
        return user if user is not None and user.allows(project) else None


def folder_grant(session: Session, project: str, capability: str, date: str) -> str:
    """`<grant id>.<mac>`: the grant of one mockup folder, the unpadded base64url HMAC-SHA256
    of `<project>/<capability>/<date>` under the session's grant key (REQ-AUTH-016)."""
    folder = f"{project}/{capability}/{date}".encode()
    mac = hmac.new(session.grant_key, folder, hashlib.sha256).digest()
    return f"{session.grant}.{base64.urlsafe_b64encode(mac).rstrip(b'=').decode()}"


MockupGrant = Callable[[Request, str, str, str], str | None]


def mockup_grant_of(state: AuthState) -> MockupGrant:
    """The grant of a mockup folder for the request's session; None while auth is off or
    without a session (REQ-REQUIREMENTS-009)."""

    def grant(request: Request, project: str, capability: str, date: str) -> str | None:
        session: Session | None = getattr(request.state, "session", None)
        if not state.enabled or session is None:
            return None
        return folder_grant(session, project, capability, date)

    return grant


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
