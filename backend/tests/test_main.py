from pathlib import Path

import pytest

from gin_console.__main__ import main
from gin_console.config import ALLOW_NON_LOOPBACK_ENV, CONFIG_ENV


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
