"""POST /api/auth/login, POST /api/auth/logout and GET /api/auth/me (REQ-AUTH-001 to 004, 006)."""

from __future__ import annotations

import asyncio
import json
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
MAX_BODY = 4096  # bytes of a sign-in body; a larger one is malformed (REQ-AUTH-003)
MAX_NAME = 64  # characters of a user name (users.NAME); a longer one is malformed
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


async def _body(request: Request) -> bytes | None:
    """The body, or None when it is over MAX_BODY bytes; never reads more than that."""
    length = request.headers.get("content-length")
    if length is not None and not (length.isdigit() and int(length) <= MAX_BODY):
        return None
    body = bytearray()
    async for chunk in request.stream():
        body += chunk
        if len(body) > MAX_BODY:
            return None
    return bytes(body)


async def _credentials(request: Request) -> tuple[str, str] | None:
    """The username and password of the body; None for any body that is not both as text,
    with a username of at most MAX_NAME characters."""
    raw = await _body(request)
    if raw is None:
        return None
    try:
        body = json.loads(raw)
    except (ValueError, RecursionError):  # not JSON, not UTF-8, or nested too deep
        return None
    if not isinstance(body, dict):
        return None
    username, password = body.get("username"), body.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return None
    if len(username) > MAX_NAME:
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

    def reserve(ip: str, key: str | None) -> JSONResponse | None:
        """Count this attempt for the IP and the username before any check (REQ-AUTH-004);
        while either is locked take both back and answer 429 with the larger Retry-After."""
        ip_wait = state.per_ip.reserve(ip)
        user_wait = None if key is None else state.per_user.reserve(key)
        locked = [wait for wait in (ip_wait, user_wait) if wait is not None]
        if not locked:
            return None
        if ip_wait is None:
            state.per_ip.release(ip)
        if key is not None and user_wait is None:
            state.per_user.release(key)
        return JSONResponse(
            status_code=429, content=LOCKED, headers={"Retry-After": str(max(locked))}
        )

    async def checked(key: str, password: str) -> User | None:
        """The user whose password this is; an unknown name is checked against DUMMY_HASH, so
        it takes as long as a wrong password (REQ-AUTH-003)."""
        user = (await run_in_threadpool(state.users)).get(key)
        encoded = user.password_hash if user is not None else DUMMY_HASH
        matched = await asyncio.to_thread(verify, password, encoded)
        return user if matched else None

    @router.post("/auth/login", response_model=SessionUser)
    async def login(request: Request, response: Response) -> SessionUser | JSONResponse:
        if not state.enabled:
            raise HTTPException(status_code=404)
        credentials = await _credentials(request)
        ip = request.client.host if request.client else ""
        key = None if credentials is None else credentials[0].lower()
        refusal = reserve(ip, key)
        if refusal is not None:  # the password is not checked
            return refusal
        user: User | None = None
        try:
            if credentials is not None and key is not None:
                user = await checked(key, credentials[1])
        finally:
            if user is None:  # the reserved attempts stay counted, also when the check raised
                _log.info("failed sign-in for %r from %s", key, ip)
        if user is None or key is None:
            return JSONResponse(status_code=401, content=INVALID)
        state.per_user.clear(key)
        state.per_ip.release(ip)  # a success counts against neither (REQ-AUTH-004)
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
        if not state.enabled:  # no cookie while auth is off (REQ-AUTH-001)
            raise HTTPException(status_code=404)
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
