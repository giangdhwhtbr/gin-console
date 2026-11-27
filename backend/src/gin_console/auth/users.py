"""The users file: who may sign in and which projects each user sees (REQ-AUTH-009, 013)."""

from __future__ import annotations

import logging
import os
import re
import tempfile
import threading
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

NAME = re.compile(r"[a-z0-9][a-z0-9._-]{0,63}")
EMAIL = re.compile(r"[^@\s]+@[^@\s]+")

_log = logging.getLogger("gin_console.auth")


class UsersError(Exception):
    """A users file problem; the message is shown to the operator and never holds a hash."""


class User(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str
    email: str
    password_hash: str
    projects: list[str] | Literal["*"]

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        if NAME.fullmatch(value) is None:
            raise ValueError(
                "must be 1 to 64 of a-z, 0-9, '.', '_' or '-', starting with a letter or digit"
            )
        return value

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        if EMAIL.fullmatch(value) is None:
            raise ValueError("must be an address such as an@example.com")
        return value

    def allows(self, project: str) -> bool:
        return self.projects == "*" or project in self.projects


class _UsersFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[User] = []


def _describe(exc: ValidationError) -> str:
    """The failing fields and reasons, without the input values (a value may be a hash)."""
    return "\n".join(
        f"  {'.'.join(str(part) for part in error['loc'])}: {error['msg']}"
        for error in exc.errors(include_url=False, include_input=False)
    )


def _parse(text: str) -> object:
    try:
        return yaml.safe_load(text)
    except yaml.YAMLError as exc:
        # The position only: the YAML error quotes the line, which may hold a hash.
        mark = getattr(exc, "problem_mark", None)
        where = f" at line {mark.line + 1}, column {mark.column + 1}" if mark else ""
        raise UsersError(f"invalid YAML{where}") from None


def load_users(path: Path, project_names: Sequence[str]) -> dict[str, User]:
    """The users of `path` by name, in file order; raises UsersError naming the reason."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        raise UsersError(
            "users file not found; add a user with `python -m gin_console user add`"
        ) from None
    except (OSError, UnicodeDecodeError) as exc:
        raise UsersError(f"cannot read the users file: {exc}") from None
    try:
        parsed = _UsersFile.model_validate(_parse(text) or {})
    except ValidationError as exc:
        raise UsersError(f"invalid users file:\n{_describe(exc)}") from None
    known = set(project_names)
    users: dict[str, User] = {}
    for user in parsed.users:
        if user.name in users:
            raise UsersError(f"duplicate user name: {user.name}")
        unknown = [] if user.projects == "*" else [p for p in user.projects if p not in known]
        if unknown:
            raise UsersError(f"user {user.name}: unknown project: {', '.join(unknown)}")
        users[user.name] = user
    return users


def save_users(path: Path, users: Iterable[User]) -> None:
    """Write `users` to `path` atomically: a 0600 temp file in the same folder, then a rename.

    A failure leaves the old file as it was and removes the temp file.
    """
    data = {"users": [user.model_dump() for user in users]}
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    replaced = False
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            if hasattr(os, "fchmod"):  # on Windows the temp file keeps its default rights
                os.fchmod(stream.fileno(), 0o600)
            yaml.safe_dump(data, stream, sort_keys=False)
        os.replace(temp, path)
        replaced = True
    finally:
        if not replaced:
            Path(temp).unlink(missing_ok=True)


# Matches no file, so the first `current()` reads the file the caller loaded before.
_UNREAD = (-1, -1, -1)


class UserDirectory:
    """The last valid users, read again when the file's (st_ino, st_mtime_ns, st_size)
    changes; `os.replace` gives the file a new inode."""

    def __init__(self, path: Path, project_names: Sequence[str], users: dict[str, User]) -> None:
        self._path = path
        self._project_names = list(project_names)
        self._users = users
        self._stat: tuple[int, int, int] | None = _UNREAD
        self._lock = threading.Lock()

    def _stat_key(self) -> tuple[int, int, int] | None:
        try:
            info = self._path.stat()
        except OSError:
            return None
        return (info.st_ino, info.st_mtime_ns, info.st_size)

    def current(self) -> tuple[dict[str, User], set[str]]:
        """The users, and the names removed or given a new hash since the last call.

        A file that fails to load keeps the last users and logs one error per change.
        """
        with self._lock:
            key = self._stat_key()
            if key == self._stat:
                return self._users, set()
            self._stat = key
            try:
                users = load_users(self._path, self._project_names)
            except UsersError as exc:
                _log.error("%s: %s; keeping the last valid users", self._path, exc)
                return self._users, set()
            changed = {
                name
                for name, old in self._users.items()
                if name not in users or users[name].password_hash != old.password_hash
            }
            self._users = users
            return users, changed
