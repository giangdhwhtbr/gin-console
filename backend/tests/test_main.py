from pathlib import Path

import pytest

from gin_console.__main__ import main
from gin_console.config import ALLOW_NON_LOOPBACK_ENV, CONFIG_ENV, HOST_ENV


# REQ-CONFIG-003
def test_main_missing_config_exits_1(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv(CONFIG_ENV, str(tmp_path / "missing.yaml"))
    assert main() == 1
    assert "config file not found" in capsys.readouterr().err


# REQ-SERVER-001
def test_main_non_loopback_exits_1(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    config = tmp_path / "config.yaml"
    config.write_text("server: {host: 0.0.0.0}\nprojects: []\n")
    monkeypatch.setenv(CONFIG_ENV, str(config))
    monkeypatch.delenv(ALLOW_NON_LOOPBACK_ENV, raising=False)
    assert main() == 1
    assert "tailscale serve" in capsys.readouterr().err


def run_main(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, yaml_text: str, allow: bool = False,
    host_env: str | None = None,
) -> list[tuple[str, int]]:
    config = tmp_path / "config.yaml"
    config.write_text(yaml_text)
    monkeypatch.setenv(CONFIG_ENV, str(config))
    if allow:
        monkeypatch.setenv(ALLOW_NON_LOOPBACK_ENV, "1")
    else:
        monkeypatch.delenv(ALLOW_NON_LOOPBACK_ENV, raising=False)
    monkeypatch.delenv(HOST_ENV, raising=False)
    if host_env:
        monkeypatch.setenv(HOST_ENV, host_env)
    calls: list[tuple[str, int]] = []
    monkeypatch.setattr(
        "gin_console.__main__.uvicorn.run",
        lambda app, host, port: calls.append((host, port)),
    )
    assert main() == 0
    return calls


# REQ-SERVER-001
@pytest.mark.parametrize("host", ["127.0.0.1", "::1"])
def test_main_loopback_starts_listening(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, host: str
) -> None:
    yaml_text = f"server: {{host: '{host}', port: 8701}}\nprojects: []\n"
    calls = run_main(monkeypatch, tmp_path, yaml_text)
    assert calls == [(host, 8701)]


# REQ-SERVER-001
def test_main_override_allows_non_loopback(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    calls = run_main(monkeypatch, tmp_path, "server: {host: 0.0.0.0}\nprojects: []\n", allow=True)
    assert calls == [("0.0.0.0", 8700)]


# REQ-CONFIG-003
def test_main_duplicate_name_exits_1(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    config = tmp_path / "config.yaml"
    config.write_text("projects:\n  - {name: a, path: /x}\n  - {name: a, path: /y}\n")
    monkeypatch.setenv(CONFIG_ENV, str(config))
    assert main() == 1
    assert "duplicate project name: a" in capsys.readouterr().err


# REQ-DOCKER-007
def test_main_host_env_overrides_config(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    calls = run_main(monkeypatch, tmp_path, "projects: []\n", allow=True, host_env="0.0.0.0")
    assert calls == [("0.0.0.0", 8700)]


# REQ-DOCKER-007
def test_main_host_env_still_hits_guard(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    config = tmp_path / "config.yaml"
    config.write_text("projects: []\n")
    monkeypatch.setenv(CONFIG_ENV, str(config))
    monkeypatch.setenv(HOST_ENV, "0.0.0.0")
    monkeypatch.delenv(ALLOW_NON_LOOPBACK_ENV, raising=False)
    assert main() == 1
    assert "0.0.0.0" in capsys.readouterr().err
