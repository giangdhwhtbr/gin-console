import json
import os
import shutil
import stat
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from gin_console.quota.models import ClaudeQuota
from gin_console.quota.source import (
    SourceError,
    clean,
    get_claude,
    get_codex,
    run_claude_usage,
    run_codex_rate_limits,
)

NOW = datetime(2026, 10, 15, 3, 0, tzinfo=UTC)
USAGE = """You are currently using your subscription to power your Claude Code usage

Current session: 41% used · resets Oct 15, 8am (UTC)
Current week (all models): 25% used · resets Oct 20, 12pm (UTC)

What's contributing to your limits usage?
Approximate, based on local sessions on this machine.
"""


def claude_of(text: str, now: datetime = NOW) -> ClaudeQuota:
    return get_claude(lambda: text, now)


# REQ-QUOTA-002
def test_quota_002_session_and_week() -> None:
    quota = claude_of(USAGE)
    assert [(w.label, w.used_percent, w.resets_at) for w in quota.windows] == [
        ("session", 41.0, datetime(2026, 10, 15, 8, 0, tzinfo=UTC)),
        ("week (all models)", 25.0, datetime(2026, 10, 20, 12, 0, tzinfo=UTC)),
    ]
    assert quota.fetched_at == NOW


# REQ-QUOTA-002
def test_quota_002_minutes_in_the_time() -> None:
    line = "Current session: 50% used · resets Oct 15, 7:59am (UTC)\n"
    assert claude_of(line).windows[0].resets_at == datetime(2026, 10, 15, 7, 59, tzinfo=UTC)


# REQ-QUOTA-002
def test_quota_002_noon_and_midnight() -> None:
    text = (
        "Current session: 1% used · resets Oct 15, 12am (UTC)\n"
        "Current week (all models): 2% used · resets Oct 20, 12pm (UTC)\n"
    )
    first, second = claude_of(text, datetime(2026, 10, 14, 23, 0, tzinfo=UTC)).windows
    assert first.resets_at == datetime(2026, 10, 15, 0, 0, tzinfo=UTC)
    assert second.resets_at == datetime(2026, 10, 20, 12, 0, tzinfo=UTC)


# REQ-QUOTA-002
def test_quota_002_year_rollover() -> None:
    text = "Current session: 9% used · resets Jan 2, 8am (UTC)\n"
    now = datetime(2026, 12, 30, 12, 0, tzinfo=UTC)
    assert claude_of(text, now).windows[0].resets_at == datetime(2027, 1, 2, 8, 0, tzinfo=UTC)


# REQ-QUOTA-002
def test_quota_002_other_limit_lines() -> None:
    text = USAGE + "Current week (Sonnet only): 3% used · resets Oct 20, 12pm (UTC)\n"
    labels = [w.label for w in claude_of(text).windows]
    assert labels == ["session", "week (all models)", "week (Sonnet only)"]


# REQ-QUOTA-002
def test_quota_002_impossible_date_line_is_skipped() -> None:
    text = USAGE + "Current week (x): 1% used · resets Feb 31, 8am (UTC)\n"
    assert len(claude_of(text).windows) == 2


# REQ-QUOTA-003
@pytest.mark.parametrize("text", ["", "You are using an API key\n", "Current session: soon\n"])
def test_quota_003_output_not_understood_carries_raw(text: str) -> None:
    with pytest.raises(SourceError, match="not understood") as caught:
        claude_of(text)
    assert caught.value.raw == text


# REQ-QUOTA-003
def test_quota_003_raw_is_cut_and_cleaned() -> None:
    with pytest.raises(SourceError) as caught:
        claude_of("x" * 5000 + "\ud800")
    assert caught.value.raw is not None
    assert len(caught.value.raw) == 4000
    caught.value.raw.encode("utf-8")


def fake_run(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, result: Any, which: str | None
) -> list[Any]:
    calls: list[Any] = []
    monkeypatch.setattr(shutil, "which", lambda name: which)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)

    def run(command: list[str], **kwargs: Any) -> Any:
        calls.append((command, kwargs))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(subprocess, "run", run)
    return calls


def done(code: int = 0, out: str = USAGE, err: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(["claude"], code, out, err)


# REQ-QUOTA-002
def test_quota_002_exact_command(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    calls = fake_run(monkeypatch, tmp_path, done(), "/usr/bin/claude")
    assert run_claude_usage() == USAGE
    ((command, kwargs),) = calls
    assert command == ["/usr/bin/claude", "-p", "/usage", "--no-session-persistence"]
    assert kwargs["stdin"] == subprocess.DEVNULL
    assert kwargs["timeout"] == 30
    assert Path(kwargs["cwd"]) != Path.cwd()


# REQ-QUOTA-003
def test_quota_003_not_found(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake_run(monkeypatch, tmp_path, done(), None)
    with pytest.raises(SourceError, match="claude command not found"):
        run_claude_usage()


# REQ-QUOTA-003
def test_quota_003_fallback_location(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    binary = tmp_path / ".local" / "bin" / "claude"
    binary.parent.mkdir(parents=True)
    binary.write_text("")
    calls = fake_run(monkeypatch, tmp_path, done(), None)
    run_claude_usage()
    assert calls[0][0][0] == str(binary)


# REQ-QUOTA-003
def test_quota_003_timeout(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake_run(monkeypatch, tmp_path, subprocess.TimeoutExpired("claude", 30), "/usr/bin/claude")
    with pytest.raises(SourceError, match="timed out"):
        run_claude_usage()


# REQ-QUOTA-003
def test_quota_003_non_zero_exit(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake_run(monkeypatch, tmp_path, done(code=1, err="boom"), "/usr/bin/claude")
    with pytest.raises(SourceError, match="exited 1: boom"):
        run_claude_usage()


# REQ-QUOTA-003
def test_quota_003_os_error(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake_run(monkeypatch, tmp_path, PermissionError(13, "Permission denied"), "/usr/bin/claude")
    with pytest.raises(SourceError, match="Permission denied"):
        run_claude_usage()


# REQ-QUOTA-007
def test_quota_007_clean_replaces_lone_surrogates() -> None:
    assert clean("a\ud800b") == "a?b"
    assert clean("ok 😀") == "ok 😀"


LIVE = {
    "ordinaryUsageAllowed": True,
    "rateLimits": {
        "limitId": "codex",
        "primary": {"usedPercent": 0, "windowDurationMins": 43200, "resetsAt": 1793947812},
        "secondary": None,
        "planType": "free",
        "rateLimitReachedType": None,
    },
    "rateLimitResetCredits": {"availableCount": 2, "credits": []},
}

FAKE_CODEX = """#!{python}
import json, os, sys, time
mode = os.environ.get("FAKE_CODEX_MODE", "ok")
with open(os.environ["FAKE_CODEX_PID"], "w") as handle:
    handle.write(str(os.getpid()))
if mode == "exit":
    sys.exit(3)

def reply(request_id, result=None, error=None):
    body = {{"id": request_id}}
    if error is not None:
        body["error"] = error
    else:
        body["result"] = result
    sys.stdout.write(json.dumps(body) + "\\n")
    sys.stdout.flush()

for line in sys.stdin:
    message = json.loads(line)
    method = message.get("method")
    if method == "initialize":
        reply(message["id"], {{"userAgent": "fake"}})
    elif method == "account/rateLimits/read":
        if mode == "silent":
            time.sleep(60)
        elif mode == "error":
            reply(message["id"], error={{"code": -1, "message": "not logged in"}})
        elif mode == "badshape":
            reply(message["id"], {{"nope": 1}})
        else:
            reply(message["id"], json.loads(os.environ["FAKE_CODEX_PAYLOAD"]))
"""


@pytest.fixture
def fake_codex(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    binary = tmp_path / "bin" / "codex"
    binary.parent.mkdir()
    binary.write_text(FAKE_CODEX.format(python=sys.executable))
    binary.chmod(binary.stat().st_mode | stat.S_IEXEC)
    monkeypatch.setenv("PATH", f"{binary.parent}{os.pathsep}{os.environ['PATH']}")
    monkeypatch.setenv("FAKE_CODEX_PID", str(tmp_path / "pid"))
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", json.dumps(LIVE))
    return tmp_path / "pid"


def ended(pid_file: Path) -> bool:
    try:
        os.kill(int(pid_file.read_text()), 0)
    except ProcessLookupError:
        return True
    return False


# REQ-QUOTA-004
def test_quota_004_one_window(fake_codex: Path) -> None:
    codex = get_codex(run_codex_rate_limits, NOW)
    assert codex.plan_type == "free"
    assert codex.reset_credits_available == 2
    assert codex.ordinary_usage_allowed is True
    assert codex.secondary is None
    assert codex.primary is not None
    assert (codex.primary.used_percent, codex.primary.window_minutes) == (0.0, 43200)
    assert codex.primary.resets_at == datetime(2026, 11, 6, 6, 50, 12, tzinfo=UTC)
    assert codex.fetched_at == NOW
    assert ended(fake_codex)


# REQ-QUOTA-004
def test_quota_004_two_windows_and_limit_reached(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    payload = {
        "ordinaryUsageAllowed": False,
        "rateLimits": {
            "primary": {"usedPercent": 16, "windowDurationMins": 300, "resetsAt": 1793947812},
            "secondary": {"usedPercent": 40.5, "windowDurationMins": 10080, "resetsAt": 1794000000},
            "planType": "plus",
            "rateLimitReachedType": "rate_limit_reached",
        },
    }
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", json.dumps(payload))
    codex = get_codex(run_codex_rate_limits, NOW)
    assert codex.primary is not None and codex.secondary is not None
    assert (codex.primary.window_minutes, codex.secondary.used_percent) == (300, 40.5)
    assert codex.ordinary_usage_allowed is False
    assert codex.rate_limit_reached_type == "rate_limit_reached"
    assert codex.reset_credits_available == 0


# REQ-QUOTA-004
def test_quota_004_bad_window_numbers_are_left_out(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    payload = {
        "rateLimits": {"primary": {"usedPercent": "lots"}, "secondary": [1], "planType": "x"}
    }
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", json.dumps(payload))
    codex = get_codex(run_codex_rate_limits, NOW)
    assert (codex.primary, codex.secondary) == (None, None)


# REQ-QUOTA-005
def test_quota_005_not_found(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("PATH", str(tmp_path))
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    with pytest.raises(SourceError, match="codex command not found"):
        run_codex_rate_limits()


# REQ-QUOTA-005
def test_quota_005_no_answer_times_out_and_the_process_is_ended(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("FAKE_CODEX_MODE", "silent")
    with pytest.raises(SourceError, match="did not answer in time"):
        run_codex_rate_limits(timeout=1.0)
    assert ended(fake_codex)


# REQ-QUOTA-005
def test_quota_005_error_answer(fake_codex: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAKE_CODEX_MODE", "error")
    with pytest.raises(SourceError, match="not logged in"):
        run_codex_rate_limits()
    assert ended(fake_codex)


# REQ-QUOTA-005
@pytest.mark.parametrize("payload", [{"nope": 1}, [1, 2], "text", None])
def test_quota_005_unexpected_shape(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch, payload: Any
) -> None:
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", json.dumps(payload))
    with pytest.raises(SourceError, match="not understood"):
        get_codex(run_codex_rate_limits, NOW)


# REQ-QUOTA-005
def test_quota_005_process_exits_early(fake_codex: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAKE_CODEX_MODE", "exit")
    with pytest.raises(SourceError, match="exited before answering"):
        run_codex_rate_limits()


# REQ-QUOTA-007
def test_quota_007_lone_surrogates_in_codex_text_are_replaced(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    raw = '{"rateLimits": {"planType": "a\\ud800b", "rateLimitReachedType": "\\ud800"}}'
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", raw)
    codex = get_codex(run_codex_rate_limits, NOW)
    assert codex.plan_type == "a?b" and codex.rate_limit_reached_type == "?"


# REQ-QUOTA-004
def test_quota_004_absurd_epoch_leaves_the_time_out(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    window = {"usedPercent": 5, "windowDurationMins": 300, "resetsAt": 99999999999999999}
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", json.dumps({"rateLimits": {"primary": window}}))
    codex = get_codex(run_codex_rate_limits, NOW)
    assert codex.primary is not None and codex.primary.resets_at is None
