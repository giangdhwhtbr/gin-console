"""API cases of the gin contract check (gin-console-rm-gin-contract): REQ-CONFIG-010,
REQ-SERVER-013 and REQ-SERVER-014. Each test performs the steps of one case with fake `gin`
runners, and reuses the helpers of the unit tests of the same change."""

import copy
import io
import subprocess
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fake_export import write_export
from fake_gin import trace
from fake_gw import LIST
from fakes import Fake
from test_contract import (
    CLEAN_REQ,
    STATE,
    FakeRunner,
    answers,
    capability_epic,
)
from test_milestones_api import make

from gin_console.config import CONFIG_ENV, ConfigError, load_settings
from gin_console.milestones.source import run_gw
from gin_console.projects.collect import configure_gin, run_json
from gin_console.projects.contract import main


@pytest.fixture(autouse=True)
def reset_gin() -> Iterator[None]:
    yield
    configure_gin(None, None)


def project_config(tmp_path: Path, name: str = "p") -> dict[str, str]:
    """A config with one project holding a capability epic; returns the environment."""
    write_export(tmp_path, [capability_epic()])
    config = tmp_path / "config.yaml"
    config.write_text(f"projects:\n  - {{name: {name}, path: {tmp_path}}}\n")
    return {CONFIG_ENV: str(config)}


def check(tmp_path: Path, runner: FakeRunner, *argv: str) -> tuple[int, str]:
    out = io.StringIO()
    return main(list(argv), project_config(tmp_path), out, runner), out.getvalue()


def write_config(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "config.yaml"
    path.write_text(text)
    return path


# --- Config


# TC: TC-CONFIG-014@81b6c8cb
def test_tc_config_014_default_gin_on_path(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    settings = load_settings(write_config(tmp_path, "projects: []\n"))
    assert settings.gin.path is None
    configure_gin(settings.gin.path, None)
    fake = Fake()
    monkeypatch.setattr(subprocess, "run", fake)
    run_json(["gin", "state"], tmp_path)
    assert fake.calls == [["gin", "state"]]


# TC: TC-CONFIG-015@c70eff49
def test_tc_config_015_set_gin_path(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    settings = load_settings(write_config(tmp_path, "gin: {path: /opt/gin/gin}\nprojects: []\n"))
    configure_gin(settings.gin.path, None)
    fake = Fake()
    monkeypatch.setattr(subprocess, "run", fake)
    run_json(["gin", "state"], tmp_path)
    run_json(["gin-qa", "state"], tmp_path)
    assert fake.calls == [["/opt/gin/gin", "state"], ["gin-qa", "state"]]


# TC: TC-CONFIG-016@82adba9a
def test_tc_config_016_gin_not_found_names_gin_path(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    config = tmp_path / "config.yaml"
    configure_gin(None, config)

    def missing(cmd: list[str], **kwargs: Any) -> None:
        raise FileNotFoundError(cmd[0])

    monkeypatch.setattr(subprocess, "run", missing)
    response = make(tmp_path, run_gw).get("/api/milestones", params={"project": "proj"})
    assert response.status_code == 502
    error = response.json()["error"]
    assert "gin.path" in error and str(config) in error


# TC: TC-CONFIG-017@c9f1eb5b
def test_tc_config_017_relative_gin_path(tmp_path: Path) -> None:
    with pytest.raises(ConfigError, match=r"gin\.path"):
        load_settings(write_config(tmp_path, "gin: {path: bin/gin}\nprojects: []\n"))


# --- Server: the contract check


# TC: TC-SERVER-024@28e1a8d4
def test_tc_server_024_contract_check_current_gin(tmp_path: Path) -> None:
    code, out = check(tmp_path, FakeRunner(answers()), "--project", "p")
    assert code == 0
    assert out.splitlines() == [
        "gin state --workflow-id c1 --format json: ok",
        "technical: not covered",
        "parity: not covered",
        "gin milestone list --all --json: ok",
        "gin milestone show gw-ab1 --json: ok",
        "gin specs trace --all --format json: ok",
        "gin specs reqs --format json: ok",
    ]


# TC: TC-SERVER-025@731a4a2d
def test_tc_server_025_contract_check_missing_key(tmp_path: Path) -> None:
    broken = copy.deepcopy(LIST)
    del broken["milestones"][0]["id"]
    code, out = check(tmp_path, FakeRunner(answers(list=broken)))
    assert code == 1
    assert "missing: milestones[0].id" in out


# TC: TC-SERVER-026@c540a72b
def test_tc_server_026_contract_check_changed_type(tmp_path: Path) -> None:
    code, out = check(tmp_path, FakeRunner(answers(state={**STATE, "stage": 3})))
    assert code == 1
    assert "type: stage" in out


# TC: TC-SERVER-027@8086f5f6
def test_tc_server_027_contract_check_new_key(tmp_path: Path) -> None:
    extra = trace({**CLEAN_REQ, "hash8": "1a2b3c4d"})
    code, out = check(tmp_path, FakeRunner(answers(trace=extra)))
    assert code == 0
    assert "gin specs trace --all --format json: ok\n  new: requirements[0].hash8\n" in out


# TC: TC-SERVER-028@354dcc5f
def test_tc_server_028_contract_check_kind_not_covered(tmp_path: Path) -> None:
    code, out = check(tmp_path, FakeRunner(answers()))
    assert code == 0
    assert "technical: not covered" in out and "parity: not covered" in out


# TC: TC-SERVER-029@cff77e40
def test_tc_server_029_contract_check_unknown_project(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    code, out = check(tmp_path, FakeRunner({}), "--project", "ghost")
    assert code == 2
    assert out == ""
    assert "ghost" in capsys.readouterr().err


# --- Server: the environment of gin calls


# TC: TC-SERVER-030@607aa334
def test_tc_server_030_session_id_removed_from_gin_calls(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("CLAUDE_CODE_SESSION_ID", "abc")
    monkeypatch.setenv("KEEP_ME", "yes")
    fake = Fake()
    monkeypatch.setattr(subprocess, "run", fake)
    run_json(["gin", "state"], tmp_path)
    assert "CLAUDE_CODE_SESSION_ID" not in fake.envs[0]
    assert fake.envs[0]["KEEP_ME"] == "yes"
