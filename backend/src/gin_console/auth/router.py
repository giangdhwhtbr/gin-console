"""POST /api/auth/login, POST /api/auth/logout and GET /api/auth/me (REQ-AUTH-001 to 004, 006)."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from gin_console.auth.access import COOKIE, AuthState, allowed_projects
from gin_console.auth.passwords import DUMMY_HASH, verify
from gin_console.auth.sessions import Session
from gin_console.auth.users import User
from gin_console.config import Settings

INVALID = {"error": "invalid username or password"}
LOCKED = {"error": "too many attempts"}

_log = logging.getLogger("gin_console.auth")


class SessionUser(BaseModel):
    name: str
    email: str
    projects: list[str]
    mockup_grant: str


class Me(BaseModel):
    enabled: bool
    user: SessionUser | None


async def _credentials(request: Request) -> tuple[str, str] | None:
    """The username and password of the body; None for any body that is not both as text."""
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001 - every unreadable body is the same failed sign-in
        return None
    if not isinstance(body, dict):
        return None
    username, password = body.get("username"), body.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return None
    return username, password


def build_router(settings: Settings, state: AuthState) -> APIRouter:
    router = APIRouter()

    def view(user: User, session: Session) -> SessionUser:
        return SessionUser(
            name=user.name,
            email=user.email,
            projects=[entry.name for entry in allowed_projects(settings, user)],
            mockup_grant=session.grant,
        )

    @router.get("/auth/me")
    def me(request: Request) -> Me:
        if not state.enabled:
            return Me(enabled=False, user=None)
        user: User | None = getattr(request.state, "user", None)  # set by the middleware
        token = request.cookies.get(COOKIE)
        session = state.sessions.get(token) if token else None
        if user is None or session is None:
            return Me(enabled=True, user=None)
        return Me(enabled=True, user=view(user, session))

    def refused(ip: str, key: str | None) -> JSONResponse | None:
        """The 429 answer while the IP or the username is locked (REQ-AUTH-004)."""
        waits = [
            state.per_ip.retry_after(ip),
            None if key is None else state.per_user.retry_after(key),
        ]
        locked = [wait for wait in waits if wait is not None]
        if not locked:
            return None
        return JSONResponse(
            status_code=429, content=LOCKED, headers={"Retry-After": str(max(locked))}
        )

    def failed(ip: str, key: str | None) -> None:
        state.per_ip.fail(ip)
        if key is not None:
            state.per_user.fail(key)
        _log.info("failed sign-in for %r from %s", None if key is None else key[:64], ip)

    async def checked(ip: str, key: str, password: str) -> User | None:
        """The user whose password this is; an unknown name is checked against DUMMY_HASH, so
        it takes as long as a wrong password (REQ-AUTH-003). A failure is counted even when
        the check raises."""
        matched = False
        try:
            user = (await run_in_threadpool(state.users)).get(key)
            encoded = user.password_hash if user is not None else DUMMY_HASH
            matched = await asyncio.to_thread(verify, password, encoded) and user is not None
        finally:
            if not matched:
                failed(ip, key)
        return user if matched else None

    @router.post("/auth/login", response_model=SessionUser)
    async def login(request: Request, response: Response) -> SessionUser | JSONResponse:
        if not state.enabled:
            raise HTTPException(status_code=404)
        credentials = await _credentials(request)
        ip = request.client.host if request.client else ""
        key = None if credentials is None else credentials[0].lower()
        refusal = refused(ip, key)
        if refusal is not None:  # the password is not checked, and the refusal not counted
            return refusal
        if credentials is None or key is None:
            failed(ip, None)
            return JSONResponse(status_code=401, content=INVALID)
        user = await checked(ip, key, credentials[1])
        if user is None:
            return JSONResponse(status_code=401, content=INVALID)
        state.per_user.clear(key)  # the IP's failures stay (REQ-AUTH-004)
        session = state.sessions.create(user.name)
        response.set_cookie(
            COOKIE,
            session.token,
            max_age=int(state.session_ttl),
            path="/",
            secure=request.url.scheme == "https",
            httponly=True,
            samesite="strict",
        )
        return view(user, session)

    @router.post("/auth/logout", status_code=204)
    def logout(request: Request, response: Response) -> None:
        token = request.cookies.get(COOKIE)
        if token:
            state.sessions.end(token)
        response.delete_cookie(
            COOKIE,
            path="/",
            secure=request.url.scheme == "https",
            httponly=True,
            samesite="strict",
        )

    return router
