from pathlib import Path

import pytest

from gin_console.config import (
    ALLOW_NON_LOOPBACK_ENV,
    CONFIG_ENV,
    HOST_ENV,
    ConfigError,
    ServerSettings,
    Settings,
    check_bind_host,
    effective_host,
    load_settings,
    resolve_config_path,
)


def write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "config.yaml"
    path.write_text(text)
    return path


# REQ-CONFIG-001
def test_config_001_default_location(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))
    assert resolve_config_path({}) == tmp_path / ".config/gin-console/config.yaml"


# REQ-CONFIG-001
def test_config_001_env_override(tmp_path: Path) -> None:
    other = tmp_path / "other.yaml"
    assert resolve_config_path({CONFIG_ENV: str(other)}) == other


# REQ-CONFIG-002
def test_config_002_valid_projects_in_order(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "projects:\n"
        "  - {name: qwikfone, path: /home/gin/qwikfone, scotty_id: qwikfone}\n"
        "  - {name: scotty, path: /home/gin/scotty}\n",
    )
    settings = load_settings(path)
    assert [p.name for p in settings.projects] == ["qwikfone", "scotty"]
    assert settings.projects[0].scotty_id == "qwikfone"
    assert settings.projects[1].scotty_id is None


# REQ-CONFIG-002
def test_config_002_server_defaults(tmp_path: Path) -> None:
    settings = load_settings(write(tmp_path, "projects: []\n"))
    assert (settings.server.host, settings.server.port) == ("127.0.0.1", 8700)


# REQ-CONFIG-003
def test_config_003_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "nope.yaml"
    with pytest.raises(ConfigError, match="config.example.yaml") as exc:
        load_settings(missing)
    assert str(missing) in str(exc.value)


# REQ-CONFIG-003
def test_config_003_invalid_yaml(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="invalid YAML"):
        load_settings(write(tmp_path, "projects: [\n"))


# REQ-CONFIG-003
def test_config_003_duplicate_name(tmp_path: Path) -> None:
    path = write(
        tmp_path,
        "projects:\n  - {name: qwikfone, path: /a}\n  - {name: qwikfone, path: /b}\n",
    )
    with pytest.raises(ConfigError, match="duplicate project name: qwikfone"):
        load_settings(path)


# REQ-CONFIG-003
def test_config_003_relative_path(tmp_path: Path) -> None:
    path = write(tmp_path, "projects:\n  - {name: qwikfone, path: qwikfone}\n")
    with pytest.raises(ConfigError, match=r"projects\.0\.path"):
        load_settings(path)


# REQ-CONFIG-003
def test_config_003_unknown_field(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match="colour"):
        load_settings(write(tmp_path, "colour: blue\n"))


# REQ-SERVER-001
@pytest.mark.parametrize("host", ["127.0.0.1", "::1", "localhost"])
def test_server_001_loopback_allowed(host: str) -> None:
    check_bind_host(host, {})


# REQ-SERVER-001
@pytest.mark.parametrize("host", ["0.0.0.0", "100.114.99.13", "example.com"])
def test_server_001_non_loopback_refused(host: str) -> None:
    with pytest.raises(ConfigError, match="tailscale serve"):
        check_bind_host(host, {})


# REQ-SERVER-001
def test_server_001_override_allows() -> None:
    check_bind_host("0.0.0.0", {ALLOW_NON_LOOPBACK_ENV: "1"})


# REQ-DOCKER-007
def test_effective_host_env_overrides_config() -> None:
    settings = Settings(server=ServerSettings(host="127.0.0.1"))
    assert effective_host(settings, {HOST_ENV: "0.0.0.0"}) == "0.0.0.0"


# REQ-DOCKER-007
def test_effective_host_defaults_to_config() -> None:
    settings = Settings(server=ServerSettings(host="127.0.0.1"))
    assert effective_host(settings, {}) == "127.0.0.1"
    assert effective_host(settings, {HOST_ENV: ""}) == "127.0.0.1"
