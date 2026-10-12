"""Console configuration: where it lives, what it contains, and where we may bind."""

from __future__ import annotations

import ipaddress
from collections.abc import Mapping
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

CONFIG_ENV = "GIN_CONSOLE_CONFIG"
ALLOW_NON_LOOPBACK_ENV = "GIN_CONSOLE_ALLOW_NON_LOOPBACK"


class ConfigError(Exception):
    """Startup configuration problem; the message is shown to the operator."""


class ServerSettings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str = "127.0.0.1"
    port: int = Field(default=8700, ge=1, le=65535)


class ProjectEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    path: Path
    scotty_id: str | None = None

    @field_validator("path")
    @classmethod
    def _absolute(cls, value: Path) -> Path:
        if not value.is_absolute():
            raise ValueError("must be an absolute path")
        return value


class Settings(BaseModel):
    model_config = ConfigDict(extra="forbid")

    server: ServerSettings = Field(default_factory=ServerSettings)
    projects: list[ProjectEntry] = Field(default_factory=list)

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


def load_settings(path: Path) -> Settings:
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
        return Settings.model_validate(data)
    except ValidationError as exc:
        raise ConfigError(f"{path}: invalid config:\n{exc}") from exc


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
