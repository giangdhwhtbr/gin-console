"""Console configuration: where it lives, what it contains, and where we may bind."""

from __future__ import annotations

import ipaddress
import re
import threading
from collections.abc import Mapping
from pathlib import Path, PureWindowsPath
from typing import Annotated

import yaml
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    ValidationError,
    field_validator,
    model_validator,
)

from gin_console.auth.users import UsersError, load_users

CONFIG_ENV = "GIN_CONSOLE_CONFIG"
ALLOW_NON_LOOPBACK_ENV = "GIN_CONSOLE_ALLOW_NON_LOOPBACK"
HOST_ENV = "GIN_CONSOLE_HOST"
_DURATION = re.compile(r"^(\d+)([smh])$")
_UNIT = {"s": 1, "m": 60, "h": 3600}


class ConfigError(Exception):
    """Startup configuration problem; the message is shown to the operator."""


class ServerSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = "127.0.0.1"
    port: int = Field(default=8700, ge=1, le=65535)


def parse_duration(value: object, minimum: int, *, or_zero: bool = False) -> float:
    """Seconds of a duration written `<n>s`, `<n>m` or `<n>h`, at least `minimum` seconds
    (a whole number of minutes); with `or_zero`, `0` is accepted too."""
    if or_zero and value in (0, "0") and not isinstance(value, bool):
        return 0.0
    allowed = "0 or " if or_zero else ""
    match = _DURATION.match(value) if isinstance(value, str) else None
    if match is None:
        raise ValueError(f"must be {allowed}a duration such as 90s, 5m or 1h")
    seconds = int(match[1]) * _UNIT[match[2]]
    if seconds < minimum:
        span = "one minute" if minimum == 60 else f"{minimum // 60} minutes"
        raise ValueError(f"must be {allowed}at least {span}")
    if seconds > threading.TIMEOUT_MAX:  # the longest wait a thread can make
        raise ValueError(f"must be at most {int(threading.TIMEOUT_MAX)} seconds")
    return float(seconds)


class BeadsSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pull_interval: float = 0  # seconds between scheduled pulls; 0 means none (REQ-CONFIG-006)

    @field_validator("pull_interval", mode="before")
    @classmethod
    def _duration(cls, value: object) -> float:
        return parse_duration(value, 60, or_zero=True)


class OverviewSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # working days in progress before a bead is listed (REQ-CONFIG-007)
    aging_days: StrictInt = Field(default=3, ge=1)


def _absolute(value: Path) -> Path:
    if not (value.is_absolute() or PureWindowsPath(value).is_absolute()):
        raise ValueError("must be an absolute path")
    return value


AbsolutePath = Annotated[Path, AfterValidator(_absolute)]


class ProjectEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    path: AbsolutePath
    pull: StrictBool = True  # run `bd dolt pull` here on refresh and on schedule
    # folders besides `path` whose images the beads may show (REQ-CONFIG-008)
    evidence_roots: list[AbsolutePath] = []


class RateLimitSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # failed sign-ins allowed per user and per client IP within the window (REQ-AUTH-004)
    per_user: StrictInt = Field(default=5, ge=1)
    per_ip: StrictInt = Field(default=20, ge=1)
    window: float = 900.0

    @field_validator("window", mode="before")
    @classmethod
    def _window(cls, value: object) -> float:
        return parse_duration(value, 60)


class AuthSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: StrictBool = False
    users_file: Path = Field(
        default=Path("~/.config/gin-console/users.yaml"), validate_default=True
    )
    session_ttl: float = 43200.0  # seconds a session lasts after sign-in (REQ-AUTH-006)
    rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)

    @field_validator("users_file")
    @classmethod
    def _expand(cls, value: Path) -> Path:
        return value.expanduser()

    @field_validator("session_ttl", mode="before")
    @classmethod
    def _session_ttl(cls, value: object) -> float:
        return parse_duration(value, 300)


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    server: ServerSettings = Field(default_factory=ServerSettings)
    beads: BeadsSettings = Field(default_factory=BeadsSettings)
    overview: OverviewSettings = Field(default_factory=OverviewSettings)
    projects: list[ProjectEntry] = Field(default_factory=list)
    auth: AuthSettings = Field(default_factory=AuthSettings)

    @model_validator(mode="after")
    def _unique_names(self) -> Settings:
        seen: set[str] = set()
        for project in self.projects:
            if project.name in seen:
                raise ValueError(f"duplicate project name: {project.name}")
            seen.add(project.name)
        return self


def default_config_path() -> Path:
    return Path.home() / ".config" / "gin-console" / "config.yaml"


def resolve_config_path(env: Mapping[str, str]) -> Path:
    raw = env.get(CONFIG_ENV)
    return Path(raw).expanduser() if raw else default_config_path()


def effective_host(settings: Settings, env: Mapping[str, str]) -> str:
    return env.get(HOST_ENV) or settings.server.host


def load_settings(path: Path, *, check_users: bool = True) -> Settings:
    """The settings of `path`; with auth on, the users file must load and hold a user.

    The `user` CLI passes `check_users=False`: it creates that file (REQ-AUTH-010).
    """
    if not path.is_file():
        raise ConfigError(
            f"config file not found: {path}\n"
            f"copy config.example.yaml to {path} and edit it, or set {CONFIG_ENV}"
        )
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError as exc:
        raise ConfigError(f"{path}: invalid YAML: {exc}") from exc
    try:
        settings = Settings.model_validate(data)
    except ValidationError as exc:
        raise ConfigError(f"{path}: invalid config:\n{exc}") from exc
    if check_users and settings.auth.enabled:
        _check_users(settings)
    return settings


def _check_users(settings: Settings) -> None:
    users_file = settings.auth.users_file
    try:
        users = load_users(users_file, [p.name for p in settings.projects])
    except UsersError as exc:
        raise ConfigError(f"{users_file}: {exc}") from exc
    if not users:
        raise ConfigError(
            f"{users_file}: no user; add one with `python -m gin_console user add`"
        )


def check_bind_host(host: str, env: Mapping[str, str]) -> None:
    try:
        loopback = ipaddress.ip_address(host).is_loopback
    except ValueError:
        loopback = host == "localhost"
    if not loopback and env.get(ALLOW_NON_LOOPBACK_ENV) != "1":
        raise ConfigError(
            f"refusing to bind {host}: gin-console must listen on loopback behind "
            f"`tailscale serve` (set {ALLOW_NON_LOOPBACK_ENV}=1 to override)"
        )
