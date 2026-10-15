# Plan: Quota

Epic: gin-console-rm-quota
Spec: docs/changes/gin-console-rm-quota-quota/ (proposal.md, spec-delta.md, design.md, tests.md)

## Objective

A Quota page and a status strip that show the real quota of Claude and Codex, taken from the interface each CLI already provides: `claude -p /usage` and `codex app-server` (`account/rateLimits/read`). Nothing is estimated or recomputed. Results are cached for 5 minutes, a Refresh button forces a new run, and nothing runs in the background.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: the owner needs to know at a glance whether Claude and Codex still have quota or have hit their limit, and when it resets, without opening each tool.
- Architecture: a new backend context `quota/` next to `projects/` and `sessions/`. `source.py` is the only module that knows the two formats and returns the console's own pydantic models; `service.py` caches each side; `router.py` serves `GET /api/quota[?refresh=1]`. The React side adds a shared data store, a strip on the Projects page and a Quota page, with history-API routing and no new dependency.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Do not recompute what the CLIs already report: no token counting, no reading of Claude or Codex session files for quota.
- Read-only: the console never writes to or deletes any Claude or Codex file itself; `claude` runs with `--no-session-persistence`; the commands are fixed and take nothing from the request.
- Single machine, Tailscale-only access; no authentication.
- Non-goals: Antigravity, multiple accounts, unofficial usage endpoints, charts or history, push notifications, estimating usage from token counts, reading Codex session files, a background worker, a config for limits, and claiming a Codex reset credit (shown, never used).
- Automated tests carry the REQ-ID in the test name or a comment.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`:
  - `brainstorm`: `high_reasoning`
  - `design`: `high_reasoning`
  - `plan`: `standard_impl`
  - `implement`: `standard_impl`
  - `review`: `high_reasoning`
  - `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: the console shows no quota information, and estimating it from transcripts would be wrong (the live Codex answer differs from the old session files, and users can reset limits).
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; on the live host the page shows the same session and week percentages that `claude /usage` prints and the same plan, window and reset credits that `codex app-server` reports.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Run the CLIs on demand, cache 5 minutes, Refresh button (selected in discuss)
- Summary: the server runs each command when a request finds the cache expired or `refresh=1` is sent.
- Pros: real numbers, nothing runs when nobody looks, no background lifecycle.
- Cons: the first request after an idle period waits a few seconds (about 4 s for Claude, 1 s for Codex, run in parallel).

### Option 2: Background schedule
- Summary: the server runs the commands every N minutes.
- Pros: data always warm.
- Cons: a worker lifecycle and CLI runs 24/7 even when nobody looks.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-QUOTA-001..007, REQ-UI-015..021.
- Out of scope: everything under non-goals; the systemd unit PATH (tracked as bug `gin-console-l9u`, see Notes).

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four tracks in a dependency chain (sources, service and API, frontend data layer and strip, quota page); each needs the previous one's interface, so one agent working in order is simplest.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/quota/__init__.py` (create) | package marker | 1 |
| `backend/src/gin_console/quota/models.py` (create) | response models | 1 |
| `backend/src/gin_console/quota/source.py` (create) | run and parse `claude /usage` and the Codex app server | 1 |
| `backend/tests/test_quota_source.py` (create) | REQ-QUOTA-002..005, part of 007 | 1 |
| `backend/src/gin_console/quota/service.py` (create) | per-side cache, refresh rule, lock | 2 |
| `backend/src/gin_console/quota/router.py` (create) | `GET /api/quota` | 2 |
| `backend/src/gin_console/app.py` (modify) | include the router; runner and clock parameters | 2 |
| `backend/tests/test_quota_service.py`, `test_quota_api.py` (create) | REQ-QUOTA-001, 006, 007 | 2 |
| `frontend/src/lib/guards.ts` (create) | shared type-guard helpers | 3 |
| `frontend/src/features/sessions/api.ts` (modify) | import the helpers | 3 |
| `frontend/src/features/quota/api.ts` (create) | types, guard, `fetchQuota` | 3 |
| `frontend/src/features/quota/quotaStore.ts` (create) | one shared request and snapshot | 3 |
| `frontend/src/features/quota/useQuota.ts` (create) | hook over the store, 60 s polling | 3 |
| `frontend/src/features/quota/status.ts` (create) | status thresholds | 3 |
| `frontend/src/features/quota/QuotaStrip.tsx` (create) | strip | 3 |
| `frontend/src/features/projects/ProjectsPage.tsx`, `ProjectsPage.test.tsx` (modify) | render the strip; mock it in the existing tests | 3 |
| `frontend/src/features/quota/quotaFixtures.ts`, `status.test.ts`, `quotaStore.test.tsx`, `QuotaStrip.test.tsx`, `frontend/src/features/projects/ProjectsPage.quota.test.tsx` (create) | UI-016/017/020/021 tests | 3 |
| `frontend/src/lib/useNow.ts` (create) | current time as state | 4 |
| `frontend/src/features/quota/format.ts` (create) | window length, age, time formatting | 4 |
| `frontend/src/features/quota/ProgressBar.tsx`, `ClaudeCard.tsx`, `CodexCard.tsx`, `QuotaPage.tsx` (create) | page | 4 |
| `frontend/src/app/Layout.tsx`, `App.tsx`, `App.test.tsx` (modify) | link and route | 4 |
| `frontend/src/features/quota/QuotaPage.test.tsx`, `format.test.ts` (create) | UI-015/018/019/021 tests | 4 |

## Tasks

### Track 1: Quota sources
- **Dependencies**: none
- **Requirements**: REQ-QUOTA-002, REQ-QUOTA-003, REQ-QUOTA-004, REQ-QUOTA-005, REQ-QUOTA-007
- **Files**: create `backend/src/gin_console/quota/{__init__,models,source}.py`, `backend/tests/test_quota_source.py`
- **Provider role**: `backend`
- **Reasoning**: `high`
- **Acceptance criteria**: every scenario of the five REQs has a passing test; the Codex process is always ended (on success, timeout, error and early exit); bad command output of any kind becomes a `SourceError`, never another exception; the Claude arguments are exactly `-p /usage --no-session-persistence`.
- **Estimated complexity**: high

Interfaces produced: `SourceError(message, raw=None)`, `run_claude_usage() -> str`, `get_claude(run, now) -> ClaudeQuota`, `run_codex_rate_limits(timeout=COMMAND_TIMEOUT) -> Any`, `get_codex(run, now) -> CodexQuota`, `clean(text) -> str`, models `QuotaError`, `ClaudeWindow`, `ClaudeQuota`, `CodexWindow`, `CodexQuota`, `Quota`.

- [ ] **Step 1: models** `quota/models.py` (`quota/__init__.py` stays empty):

```python
from datetime import datetime

from pydantic import BaseModel


class QuotaError(BaseModel):
    error: str
    raw: str | None = None


class ClaudeWindow(BaseModel):
    label: str
    used_percent: float
    resets_at: datetime


class ClaudeQuota(BaseModel):
    windows: list[ClaudeWindow]
    fetched_at: datetime


class CodexWindow(BaseModel):
    used_percent: float
    window_minutes: int | None
    resets_at: datetime | None


class CodexQuota(BaseModel):
    plan_type: str | None
    ordinary_usage_allowed: bool | None
    rate_limit_reached_type: str | None
    reset_credits_available: int
    primary: CodexWindow | None
    secondary: CodexWindow | None
    fetched_at: datetime


class Quota(BaseModel):
    claude: ClaudeQuota | QuotaError
    codex: CodexQuota | QuotaError
```

- [ ] **Step 2: failing tests** `backend/tests/test_quota_source.py`. Part A, Claude (fake runner and monkeypatched `subprocess.run`/`shutil.which`):

```python
import json
import os
import stat
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from gin_console.quota import source
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


def fake_run(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, result: Any, which: str | None) -> list[Any]:
    calls: list[Any] = []
    monkeypatch.setattr(source.shutil, "which", lambda name: which)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)

    def run(command: list[str], **kwargs: Any) -> Any:
        calls.append((command, kwargs))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(source.subprocess, "run", run)
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
```

Part B, Codex, appended to the same file. A real fake `codex` executable speaks JSON-RPC lines over real pipes, so the pipe handling, timeout and process cleanup are exercised:

```python
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
    payload = {"rateLimits": {"primary": {"usedPercent": "lots"}, "secondary": [1], "planType": "x"}}
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
```

(`FAKE_CODEX_PAYLOAD` holds a JSON text; here it contains a `\ud800` JSON escape, so the script's `json.loads` produces a lone surrogate and its `json.dumps` writes the escape back to the pipe.) Run `uv --directory backend run pytest tests/test_quota_source.py -q`; expect an import error (module missing).

- [ ] **Step 3: implement** `quota/source.py`:

```python
"""Claude and Codex quota; the only module that knows how each CLI reports it."""

import json
import os
import re
import select
import shutil
import subprocess
import tempfile
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from importlib.metadata import version
from pathlib import Path
from typing import Any

from gin_console.quota.models import ClaudeQuota, ClaudeWindow, CodexQuota, CodexWindow

COMMAND_TIMEOUT = 30.0
RAW_LIMIT = 4000
_MONTHS = {
    name: number
    for number, name in enumerate(
        "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), start=1
    )
}
_USAGE_LINE = re.compile(
    r"^Current (?P<label>.+?): (?P<percent>\d+(?:\.\d+)?)% used · resets "
    r"(?P<month>[A-Z][a-z]{2}) (?P<day>\d{1,2}), (?P<hour>\d{1,2})(?::(?P<minute>\d{2}))?"
    r"(?P<half>am|pm) \(UTC\)\s*$",
    re.MULTILINE,
)


class SourceError(Exception):
    """A CLI failed or said something unexpected; the message is shown in the UI."""

    def __init__(self, message: str, raw: str | None = None) -> None:
        super().__init__(clean(message))
        self.raw = None if raw is None else clean(raw[:RAW_LIMIT])


def clean(text: str) -> str:
    """Replace lone surrogates: valid in JSON, but a response cannot encode them as UTF-8."""
    return text.encode("utf-8", "replace").decode("utf-8")


def _find(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    fallback = Path.home() / ".local" / "bin" / name
    if fallback.is_file():
        return str(fallback)
    raise SourceError(f"{name} command not found")


def run_claude_usage() -> str:
    command = _find("claude")
    with tempfile.TemporaryDirectory() as workdir:
        try:
            done = subprocess.run(
                [command, "-p", "/usage", "--no-session-persistence"],
                cwd=workdir,
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True,
                timeout=COMMAND_TIMEOUT,
                check=False,
            )
        except subprocess.TimeoutExpired:
            raise SourceError("claude timed out") from None
        except OSError as exc:
            raise SourceError(f"claude failed: {exc.strerror}") from None
    if done.returncode != 0:
        raise SourceError(f"claude exited {done.returncode}: {done.stderr.strip()[:200]}")
    return done.stdout


def _reset_time(match: re.Match[str], now: datetime) -> datetime | None:
    hour = int(match["hour"]) % 12 + (12 if match["half"] == "pm" else 0)
    try:
        candidate = datetime(
            now.year,
            _MONTHS[match["month"]],
            int(match["day"]),
            hour,
            int(match["minute"] or 0),
            tzinfo=UTC,
        )
        if candidate < now - timedelta(hours=12):
            candidate = candidate.replace(year=now.year + 1)
    except (KeyError, ValueError):  # an unknown month or an impossible date
        return None
    return candidate


def get_claude(run: Callable[[], str], now: datetime) -> ClaudeQuota:
    text = run()
    windows: list[ClaudeWindow] = []
    for match in _USAGE_LINE.finditer(text):
        resets_at = _reset_time(match, now)
        if resets_at is not None:
            windows.append(
                ClaudeWindow(
                    label=clean(match["label"]),
                    used_percent=float(match["percent"]),
                    resets_at=resets_at,
                )
            )
    if not windows:
        raise SourceError("claude /usage output was not understood", raw=text)
    return ClaudeQuota(windows=windows, fetched_at=now)


def run_codex_rate_limits(timeout: float = COMMAND_TIMEOUT) -> Any:
    """Ask `codex app-server` (JSON-RPC over stdio) for the account's rate limits."""
    command = _find("codex")
    deadline = time.monotonic() + timeout
    with tempfile.TemporaryDirectory() as workdir:
        try:
            process = subprocess.Popen(
                [command, "app-server"],
                cwd=workdir,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=0,
            )
        except OSError as exc:
            raise SourceError(f"codex failed: {exc.strerror}") from None
        try:
            return _codex_conversation(process, deadline)
        finally:
            process.kill()
            process.wait()


def _codex_conversation(process: "subprocess.Popen[bytes]", deadline: float) -> Any:
    assert process.stdin is not None and process.stdout is not None
    stdin, stdout = process.stdin, process.stdout
    buffer = b""

    def send(message: dict[str, Any]) -> None:
        try:
            stdin.write(json.dumps(message).encode() + b"\n")
        except OSError:
            raise SourceError("codex exited before answering") from None

    def answer(request_id: int) -> dict[str, Any]:
        nonlocal buffer
        while True:
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                try:
                    message = json.loads(line)
                except (ValueError, RecursionError):
                    continue
                if isinstance(message, dict) and message.get("id") == request_id:
                    return message
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise SourceError("codex did not answer in time")
            ready, _, _ = select.select([stdout], [], [], remaining)
            if not ready:
                raise SourceError("codex did not answer in time")
            chunk = os.read(stdout.fileno(), 65536)
            if not chunk:
                raise SourceError("codex exited before answering")
            buffer += chunk

    client = {"name": "gin-console", "version": version("gin-console")}
    send({"id": 1, "method": "initialize", "params": {"clientInfo": client}})
    _check(answer(1))
    send({"method": "initialized"})
    send({"id": 2, "method": "account/rateLimits/read", "params": None})
    return _check(answer(2)).get("result")


def _check(reply: dict[str, Any]) -> dict[str, Any]:
    error = reply.get("error")
    if error is not None:
        message = error.get("message") if isinstance(error, dict) else error
        raise SourceError(f"codex: {message}")
    return reply


def _window(raw: Any) -> CodexWindow | None:
    if not isinstance(raw, dict):
        return None
    used = raw.get("usedPercent")
    if isinstance(used, bool) or not isinstance(used, int | float):
        return None
    minutes, epoch = raw.get("windowDurationMins"), raw.get("resetsAt")
    resets_at = None
    if type(epoch) is int:
        try:
            resets_at = datetime.fromtimestamp(epoch, tz=UTC)
        except (OverflowError, OSError, ValueError):  # an absurd epoch: leave the time out
            resets_at = None
    return CodexWindow(
        used_percent=float(used),
        window_minutes=minutes if type(minutes) is int else None,
        resets_at=resets_at,
    )


def _text(value: Any) -> str | None:
    return clean(value) if isinstance(value, str) else None


def get_codex(run: Callable[[], Any], now: datetime) -> CodexQuota:
    result = run()
    limits = result.get("rateLimits") if isinstance(result, dict) else None
    if not isinstance(limits, dict):
        raise SourceError("codex response was not understood")
    credits = result.get("rateLimitResetCredits")
    available = credits.get("availableCount") if isinstance(credits, dict) else None
    allowed = result.get("ordinaryUsageAllowed")
    return CodexQuota(
        plan_type=_text(limits.get("planType")),
        ordinary_usage_allowed=allowed if isinstance(allowed, bool) else None,
        rate_limit_reached_type=_text(limits.get("rateLimitReachedType")),
        reset_credits_available=available if type(available) is int else 0,
        primary=_window(limits.get("primary")),
        secondary=_window(limits.get("secondary")),
        fetched_at=now,
    )
```

Add this test to Part B (it covers the `_window` guard for an absurd epoch):

```python
# REQ-QUOTA-004
def test_quota_004_absurd_epoch_leaves_the_time_out(
    fake_codex: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    window = {"usedPercent": 5, "windowDurationMins": 300, "resetsAt": 99999999999999999}
    monkeypatch.setenv("FAKE_CODEX_PAYLOAD", json.dumps({"rateLimits": {"primary": window}}))
    codex = get_codex(run_codex_rate_limits, NOW)
    assert codex.primary is not None and codex.primary.resets_at is None
```

- [ ] **Step 4:** run `uv --directory backend run pytest tests/test_quota_source.py -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green. Fix the `ruff` import-order of the test imports if needed.

- [ ] **Step 5: real-host probe** (not a unit test, results go in the track notes): from `backend/`, with the real CLIs,

```bash
uv run python - <<'EOF'
import time
from datetime import UTC, datetime
from gin_console.quota.source import get_claude, get_codex, run_claude_usage, run_codex_rate_limits
now = datetime.now(UTC)
t = time.time(); claude = get_claude(run_claude_usage, now); print(round(time.time() - t, 1), "s", claude.windows)
t = time.time(); codex = get_codex(run_codex_rate_limits, now); print(round(time.time() - t, 1), "s", codex)
EOF
```

Expect the session and week windows that `claude /usage` prints and the live Codex plan and window; both well under 30 s. Report the numbers; do not edit anything outside the scope.

### Track 2: Quota service and API
- **Dependencies**: Track 1
- **Requirements**: REQ-QUOTA-001, REQ-QUOTA-006, REQ-QUOTA-007
- **Files**: create `backend/src/gin_console/quota/{service,router}.py`, `backend/tests/test_quota_service.py`, `backend/tests/test_quota_api.py`; modify `backend/src/gin_console/app.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the three REQs has a passing test; a side failing never fails the request; overlapping requests run a command once; `refresh=` with any value never reaches the commands and never gives a 4xx.
- **Estimated complexity**: medium

Interfaces consumed: Track 1. Produced: `CachedSide[T]`, `utc_now() -> datetime`, `build_router(run_claude, run_codex, clock) -> APIRouter`, `create_app(settings, static_dir=..., claude_home=..., run_claude=run_claude_usage, run_codex=run_codex_rate_limits, clock=utc_now)`, JSON `{claude: {windows, fetched_at} | {error, raw}, codex: {...} | {error, raw}}`.

- [ ] **Step 1: failing tests.** `backend/tests/test_quota_service.py`:

```python
import threading
import time
from datetime import UTC, datetime, timedelta

from gin_console.quota.models import QuotaError
from gin_console.quota.service import CachedSide
from gin_console.quota.source import SourceError

START = datetime(2026, 10, 15, 3, 0, tzinfo=UTC)


class Clock:
    def __init__(self) -> None:
        self.now = START

    def __call__(self) -> datetime:
        return self.now

    def advance(self, **delta: float) -> None:
        self.now += timedelta(**delta)


def side(clock: Clock, fail: bool = False, delay: float = 0.0) -> tuple[CachedSide[datetime], list[int]]:
    runs: list[int] = []

    def fetch(now: datetime) -> datetime:
        runs.append(1)
        if delay:
            time.sleep(delay)
        if fail:
            raise SourceError("boom")
        return now

    return CachedSide(fetch, clock), runs


# REQ-QUOTA-006
def test_quota_006_reused_within_five_minutes() -> None:
    clock = Clock()
    cached, runs = side(clock)
    first = cached.get(False)
    clock.advance(minutes=2)
    assert cached.get(False) == first
    assert len(runs) == 1


# REQ-QUOTA-006
def test_quota_006_expired_after_five_minutes() -> None:
    clock = Clock()
    cached, runs = side(clock)
    cached.get(False)
    clock.advance(minutes=6)
    assert cached.get(False) == START + timedelta(minutes=6)
    assert len(runs) == 2


# REQ-QUOTA-006
def test_quota_006_forced_refresh_and_too_soon() -> None:
    clock = Clock()
    cached, runs = side(clock)
    cached.get(False)
    clock.advance(seconds=10)
    cached.get(True)
    assert len(runs) == 1  # too soon
    clock.advance(seconds=30)
    cached.get(True)
    assert len(runs) == 2


# REQ-QUOTA-006
def test_quota_006_errors_are_not_kept() -> None:
    clock = Clock()
    cached, runs = side(clock, fail=True)
    first = cached.get(False)
    assert isinstance(first, QuotaError) and first.error == "boom"
    cached.get(False)
    assert len(runs) == 2


# REQ-QUOTA-006
def test_quota_006_overlapping_requests_run_once() -> None:
    clock = Clock()
    cached, runs = side(clock, delay=0.2)
    threads = [threading.Thread(target=cached.get, args=(False,)) for _ in range(3)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(runs) == 1


# REQ-QUOTA-001
def test_quota_001_unexpected_exception_is_confined_to_its_side() -> None:
    def fetch(now: datetime) -> datetime:
        raise ZeroDivisionError

    result = CachedSide(fetch, Clock()).get(False)
    assert isinstance(result, QuotaError) and "ZeroDivisionError" in result.error
```

`backend/tests/test_quota_api.py`:

```python
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import Settings
from gin_console.quota.source import SourceError

USAGE = (
    "Current session: 41% used · resets Oct 15, 8am (UTC)\n"
    "Current week (all models): 25% used · resets Oct 20, 12pm (UTC)\n"
)
LIVE = {
    "ordinaryUsageAllowed": True,
    "rateLimits": {
        "primary": {"usedPercent": 16, "windowDurationMins": 300, "resetsAt": 1793947812},
        "planType": "plus",
    },
    "rateLimitResetCredits": {"availableCount": 1},
}


def client(tmp_path: Path, claude: Any, codex: Any) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir(exist_ok=True)
    app = create_app(
        Settings(),
        static_dir=static,
        claude_home=tmp_path,
        run_claude=claude,
        run_codex=codex,
        clock=lambda: datetime(2026, 10, 15, 3, 0, tzinfo=UTC),
    )
    return TestClient(app)


# REQ-QUOTA-001
def test_quota_001_both_sides(tmp_path: Path) -> None:
    body = client(tmp_path, lambda: USAGE, lambda: LIVE).get("/api/quota").json()
    assert [w["label"] for w in body["claude"]["windows"]] == ["session", "week (all models)"]
    assert body["codex"]["plan_type"] == "plus"
    assert body["codex"]["primary"]["used_percent"] == 16.0
    assert body["codex"]["fetched_at"].startswith("2026-10-15T03:00:00")


# REQ-QUOTA-001
def test_quota_001_one_side_fails(tmp_path: Path) -> None:
    def broken() -> Any:
        raise SourceError("codex command not found")

    body = client(tmp_path, lambda: USAGE, broken).get("/api/quota").json()
    assert body["codex"] == {"error": "codex command not found", "raw": None}
    assert "windows" in body["claude"]


# REQ-QUOTA-001
def test_quota_001_unparseable_claude_output_carries_raw(tmp_path: Path) -> None:
    body = client(tmp_path, lambda: "API key login\n", lambda: LIVE).get("/api/quota").json()
    assert body["claude"]["error"] == "claude /usage output was not understood"
    assert body["claude"]["raw"] == "API key login\n"
    assert "plan_type" in body["codex"]


# REQ-QUOTA-006
def test_quota_006_refresh_flag_forces_a_run(tmp_path: Path) -> None:
    runs: list[int] = []
    now = [datetime(2026, 10, 15, 3, 0, tzinfo=UTC)]

    def claude() -> str:
        runs.append(1)
        return USAGE

    static = tmp_path / "dist"
    static.mkdir(exist_ok=True)
    app = create_app(
        Settings(),
        static_dir=static,
        claude_home=tmp_path,
        run_claude=claude,
        run_codex=lambda: LIVE,
        clock=lambda: now[0],
    )
    api = TestClient(app)
    api.get("/api/quota")
    api.get("/api/quota")
    assert len(runs) == 1  # reused
    now[0] += timedelta(seconds=10)
    api.get("/api/quota", params={"refresh": "1"})
    assert len(runs) == 1  # forced, but under 30 seconds since the last run
    now[0] += timedelta(seconds=31)
    api.get("/api/quota", params={"refresh": "1"})
    assert len(runs) == 2  # forced and old enough


# REQ-QUOTA-007
def test_quota_007_refresh_value_is_never_passed_on(tmp_path: Path) -> None:
    seen: list[Any] = []

    def claude(*args: Any) -> str:
        seen.append(args)
        return USAGE

    response = client(tmp_path, claude, lambda: LIVE).get("/api/quota", params={"refresh": "../x"})
    assert response.status_code == 200
    assert seen == [()]


# REQ-QUOTA-007
def test_quota_007_lone_surrogate_in_raw_does_not_break_the_response(tmp_path: Path) -> None:
    response = client(tmp_path, lambda: "x\ud800y", lambda: LIVE).get("/api/quota")
    assert response.status_code == 200
    assert response.json()["claude"]["raw"] == "x?y"
```

(`test_quota_006_refresh_flag_forces_a_run` additionally calls `app.get("/api/quota", params={"refresh": "1"})` right after the second request and asserts the runs stay 1 because of the 30-second rule; to prove the forced path, build the app with a mutable clock like `Clock` from the service tests, advance 31 s, request with `refresh=1`, and assert `len(runs) == 2`. Write that version.) Run `uv --directory backend run pytest -q`; expect failures.

- [ ] **Step 2: service** `quota/service.py`:

```python
import threading
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from gin_console.quota.models import QuotaError
from gin_console.quota.source import SourceError, clean

TTL = timedelta(minutes=5)
MIN_REFRESH = timedelta(seconds=30)


def utc_now() -> datetime:
    return datetime.now(UTC)


class CachedSide[T]:
    """One side of the quota: runs `fetch` under a lock and reuses a successful result."""

    def __init__(self, fetch: Callable[[datetime], T], clock: Callable[[], datetime]) -> None:
        self._fetch = fetch
        self._clock = clock
        self._lock = threading.Lock()
        self._value: T | None = None
        self._at: datetime | None = None

    def get(self, refresh: bool) -> T | QuotaError:
        with self._lock:
            now = self._clock()
            if self._value is not None and self._at is not None:
                age = now - self._at
                if age < MIN_REFRESH or (age < TTL and not refresh):
                    return self._value
            try:
                value = self._fetch(now)
            except SourceError as exc:
                return QuotaError(error=str(exc), raw=exc.raw)
            except Exception as exc:  # isolation boundary: one side must not take the other down
                return QuotaError(error=clean(f"unexpected error: {type(exc).__name__}"))
            self._value, self._at = value, now
            return value
```

- [ ] **Step 3: router and app.** `quota/router.py`:

```python
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any

from fastapi import APIRouter

from gin_console.quota.models import ClaudeQuota, CodexQuota, Quota
from gin_console.quota.service import CachedSide
from gin_console.quota.source import get_claude, get_codex


def build_router(
    run_claude: Callable[[], str],
    run_codex: Callable[[], Any],
    clock: Callable[[], datetime],
) -> APIRouter:
    router = APIRouter()
    claude = CachedSide[ClaudeQuota](lambda now: get_claude(run_claude, now), clock)
    codex = CachedSide[CodexQuota](lambda now: get_codex(run_codex, now), clock)

    @router.get("/quota")
    def get_quota(refresh: str | None = None) -> Quota:
        force = refresh == "1"  # any other value means "no": it is never passed on
        with ThreadPoolExecutor(max_workers=2) as pool:
            claude_result = pool.submit(claude.get, force)
            codex_result = pool.submit(codex.get, force)
            return Quota(claude=claude_result.result(), codex=codex_result.result())

    return router
```

In `app.py`: add imports (`from collections.abc import Callable`, `from datetime import datetime`, `from typing import Any`, `from gin_console.quota.router import build_router as build_quota_router`, `from gin_console.quota.service import utc_now`, `from gin_console.quota.source import run_claude_usage, run_codex_rate_limits`), extend the signature with `run_claude: Callable[[], str] = run_claude_usage, run_codex: Callable[[], Any] = run_codex_rate_limits, clock: Callable[[], datetime] = utc_now`, and add `api.include_router(build_quota_router(run_claude, run_codex, clock))` after the sessions router and before the `/{rest:path}` catch-all.

- [ ] **Step 4:** run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green. Then a real-host probe through the HTTP layer: `TestClient(create_app(load_settings(default_config_path())))` calling `/api/quota` twice (second call instant) and once with `?refresh=1`; report timings and the JSON shape.

### Track 3: Quota data layer and strip
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-016, REQ-UI-017, REQ-UI-020, part of REQ-UI-021 (the strip shows an error note)
- **Files**: create `frontend/src/lib/guards.ts`, `frontend/src/features/quota/{api.ts,quotaStore.ts,useQuota.ts,status.ts,QuotaStrip.tsx}` and their tests; modify `frontend/src/features/sessions/api.ts`, `frontend/src/features/projects/ProjectsPage.tsx`, `frontend/src/features/projects/ProjectsPage.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-016, 017 and 020 has a vitest test; a malformed response is an error, never a crash; the strip and the page share one in-flight request; the Projects page tests pass; no new dependency.
- **Estimated complexity**: medium

Interfaces produced: types `Quota`, `ClaudeQuota`, `CodexQuota`, `QuotaError`, `ClaudeWindow`, `CodexWindow`; `isQuotaError`, `fetchQuota(refresh)`; `loadQuota(refresh)`, `getQuotaState`, `subscribeQuota`, `resetQuotaStore`; `useQuota() -> { snapshot, pending, reload, refresh }`; `claudeStatus`, `codexStatus -> { level, percent }`, `LEVEL_LABEL`.

- [ ] **Step 1: shared guard helpers.** Create `frontend/src/lib/guards.ts` with the helpers currently private to `sessions/api.ts`, and make `sessions/api.ts` import them (delete its three local consts; behavior unchanged, its tests are the guard):

```ts
// Reflect.get keeps the guards free of type assertions; the result is checked before use.
export const field = (value: object, key: string): unknown => Reflect.get(value, key);
export const isString = (value: unknown) => typeof value === "string";
export const isStringOrNull = (value: unknown) => value === null || typeof value === "string";
export const isFiniteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
```

- [ ] **Step 2: failing tests.** First a shared test-support module `frontend/src/features/quota/quotaFixtures.ts`:

```ts
import type { ClaudeQuota, CodexQuota, Quota } from "./api";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const LABELS = ["session", "week (all models)", "week (Sonnet only)"];

export const claudeQuota = (...percents: number[]): ClaudeQuota => ({
  windows: percents.map((used_percent, i) => ({
    label: LABELS[i] ?? `window ${i}`,
    used_percent,
    resets_at: "2026-10-20T12:00:00Z",
  })),
  fetched_at: "2026-10-15T03:00:00Z",
});

export const codexQuota = (overrides: Partial<CodexQuota> = {}): CodexQuota => ({
  plan_type: "plus",
  ordinary_usage_allowed: true,
  rate_limit_reached_type: null,
  reset_credits_available: 0,
  primary: { used_percent: 16, window_minutes: 300, resets_at: "2026-10-15T08:00:00Z" },
  secondary: null,
  fetched_at: "2026-10-15T03:00:00Z",
  ...overrides,
});

export const quota = (
  claude: Quota["claude"] = claudeQuota(41, 25),
  codex: Quota["codex"] = codexQuota(),
): Quota => ({ claude, codex });
```

`frontend/src/features/quota/status.test.ts` (REQ-UI-017):

```ts
import { describe, expect, it } from "vitest";
import { claudeQuota, codexQuota } from "./quotaFixtures";
import { claudeStatus, codexStatus } from "./status";

describe("status", () => {
  // REQ-UI-017
  it("REQ-UI-017 applies the Claude thresholds to the highest percentage", () => {
    expect(claudeStatus(claudeQuota(79, 5))).toEqual({ level: "ok", percent: 79 });
    expect(claudeStatus(claudeQuota(5, 80)).level).toBe("near");
    expect(claudeStatus(claudeQuota(100)).level).toBe("limited");
  });

  // REQ-UI-017
  it("REQ-UI-017 reads Codex from its windows and blocked flag", () => {
    expect(codexStatus(codexQuota()).level).toBe("ok");
    expect(codexStatus(codexQuota({ ordinary_usage_allowed: false })).level).toBe("limited");
    expect(codexStatus(codexQuota({ primary: null })).level).toBe("no-data");
    const both = codexQuota({
      secondary: { used_percent: 85, window_minutes: 10080, resets_at: null },
    });
    expect(codexStatus(both)).toEqual({ level: "near", percent: 85 });
  });

  // REQ-UI-017
  it("REQ-UI-017 reads an error side as error and an empty Claude as no data", () => {
    expect(claudeStatus({ error: "claude timed out" }).level).toBe("error");
    expect(codexStatus({ error: "codex command not found" }).level).toBe("error");
    expect(claudeStatus(claudeQuota()).level).toBe("no-data");
  });
});
```

`frontend/src/features/quota/quotaStore.test.tsx` (REQ-UI-020, REQ-UI-021, REQ-UI-018 refresh):

```tsx
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claudeQuota, json, quota } from "./quotaFixtures";
import { resetQuotaStore } from "./quotaStore";
import { claudeStatus } from "./status";
import { useQuota } from "./useQuota";

function Probe({ name }: { name: string }) {
  const { snapshot, pending, refresh } = useQuota();
  const detail =
    snapshot.status === "ok"
      ? `ok ${claudeStatus(snapshot.quota.claude).percent}${snapshot.error ? ` error:${snapshot.error}` : ""}`
      : snapshot.status === "error"
        ? `error ${snapshot.message}`
        : "loading";
  return (
    <div>
      <span>{`${name} ${detail} ${pending ? "pending" : "idle"}`}</span>
      <button onClick={refresh}>{`refresh ${name}`}</button>
    </div>
  );
}

const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("quota store", () => {
  // REQ-UI-020
  it("REQ-UI-020 shares one request between the strip and the page", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(quota())));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    expect(await screen.findByText(/^a ok 41 idle/)).toBeInTheDocument();
    expect(screen.getByText(/^b ok 41 idle/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // REQ-UI-020
  it("REQ-UI-020 reloads every 60 seconds without a loading state", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota(claudeQuota(41)))))
      .mockImplementation(() => Promise.resolve(json(quota(claudeQuota(50)))));
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe name="a" />);
    await settle(0);
    expect(screen.getByText(/^a ok 41/)).toBeInTheDocument();
    await settle(60_000);
    expect(screen.getByText(/^a ok 50/)).toBeInTheDocument();
    expect(screen.queryByText(/loading/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // REQ-UI-020
  it("REQ-UI-020 does not poll while hidden and reloads when visible again", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => Promise.resolve(json(quota())));
    vi.stubGlobal("fetch", fetchMock);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(<Probe name="a" />);
    await settle(0);
    visibility.mockReturnValue("hidden");
    await settle(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // REQ-UI-020
  it("REQ-UI-020 keeps the last data when a refresh fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota())))
      .mockImplementation(() => Promise.resolve(json({}, 500)));
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe name="a" />);
    await settle(0);
    await settle(60_000);
    expect(screen.getByText(/^a ok 41 error:.*500/)).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 rejects a response of an unexpected shape", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ claude: 1, codex: [] }))));
    render(<Probe name="a" />);
    expect(await screen.findByText(/^a error .*unexpected response/)).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 accepts an error object for one side", async () => {
    const body = quota(claudeQuota(41), { error: "codex command not found" });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(body))));
    render(<Probe name="a" />);
    expect(await screen.findByText(/^a ok 41 idle/)).toBeInTheDocument();
  });

  // REQ-UI-018
  it("REQ-UI-018 a forced refresh sends refresh=1 and is pending until it answers", async () => {
    let answer: (response: Response) => void = () => undefined;
    const pendingAnswer = new Promise<Response>((resolve) => {
      answer = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota())))
      .mockImplementationOnce(() => pendingAnswer);
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe name="a" />);
    await screen.findByText(/^a ok 41 idle/);
    act(() => screen.getByText("refresh a").click());
    expect(await screen.findByText(/^a ok 41 pending/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/quota?refresh=1");
    await act(async () => {
      answer(json(quota(claudeQuota(60))));
      await pendingAnswer;
    });
    expect(await screen.findByText(/^a ok 60 idle/)).toBeInTheDocument();
  });
});
```

`frontend/src/features/quota/QuotaStrip.test.tsx` (REQ-UI-016):

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claudeQuota, codexQuota, json, quota } from "./quotaFixtures";
import { resetQuotaStore } from "./quotaStore";
import { QuotaStrip } from "./QuotaStrip";

const answer = (body: Response) => vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(body.clone())));

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("QuotaStrip", () => {
  // REQ-UI-016
  it("REQ-UI-016 shows a status for each harness, both linking to the quota page", async () => {
    answer(json(quota()));
    render(<QuotaStrip />);
    const claude = await screen.findByRole("link", { name: "Claude ok 41%" });
    const codex = screen.getByRole("link", { name: "Codex ok 16%" });
    expect(claude).toHaveAttribute("href", "/quota");
    expect(codex).toHaveAttribute("href", "/quota");
  });

  // REQ-UI-016
  it("REQ-UI-016 says near the limit, limited, no data and error in words", async () => {
    answer(json(quota(claudeQuota(85), codexQuota({ primary: null }))));
    const { unmount } = render(<QuotaStrip />);
    expect(await screen.findByRole("link", { name: "Claude near the limit 85%" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Codex no data" })).toBeVisible();
    unmount();
    resetQuotaStore();
    answer(json(quota({ error: "claude timed out" }, codexQuota({ ordinary_usage_allowed: false }))));
    render(<QuotaStrip />);
    expect(await screen.findByRole("link", { name: "Claude error" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Codex limited 16%" })).toBeVisible();
  });

  // REQ-UI-016
  it("REQ-UI-016 shows a note when the quota cannot be loaded", async () => {
    answer(json({}, 500));
    render(<QuotaStrip />);
    expect(await screen.findByRole("status")).toHaveTextContent(/Quota unavailable.*500/);
  });
});
```

`frontend/src/features/projects/ProjectsPage.quota.test.tsx` (REQ-UI-016, the real strip inside the real page):

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { json } from "@/features/quota/quotaFixtures";
import { resetQuotaStore } from "@/features/quota/quotaStore";
import { ProjectsPage } from "./ProjectsPage";

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProjectsPage with the quota strip", () => {
  // REQ-UI-016
  it("REQ-UI-016 still lists the projects when the quota request fails", async () => {
    const project = {
      name: "qwikfone",
      path: "/home/gin/qwikfone",
      scotty_id: null,
      scotty_url: null,
      exists: true,
      workflow: null,
      beads: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(url.includes("/api/quota") ? json({}, 500) : json([project])),
      ),
    );
    render(<ProjectsPage />);
    expect(await screen.findByRole("article", { name: "qwikfone" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(/Quota unavailable/);
  });
});
```

Run `pnpm -C frontend test --run`; expect failures (modules missing).

- [ ] **Step 3: API module** `quota/api.ts`:

```ts
import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";

export type QuotaError = { error: string; raw?: string | null };
export type ClaudeWindow = { label: string; used_percent: number; resets_at: string };
export type ClaudeQuota = { windows: ClaudeWindow[]; fetched_at: string };
export type CodexWindow = {
  used_percent: number;
  window_minutes: number | null;
  resets_at: string | null;
};
export type CodexQuota = {
  plan_type: string | null;
  ordinary_usage_allowed: boolean | null;
  rate_limit_reached_type: string | null;
  reset_credits_available: number;
  primary: CodexWindow | null;
  secondary: CodexWindow | null;
  fetched_at: string;
};
export type Quota = { claude: ClaudeQuota | QuotaError; codex: CodexQuota | QuotaError };

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isNumberOrNull = (value: unknown) => value === null || isFiniteNumber(value);
const isBoolOrNull = (value: unknown) => value === null || typeof value === "boolean";

export function isQuotaError(value: unknown): value is QuotaError {
  return isObject(value) && isString(field(value, "error"));
}

function isClaudeWindow(value: unknown): value is ClaudeWindow {
  return (
    isObject(value) &&
    isString(field(value, "label")) &&
    isFiniteNumber(field(value, "used_percent")) &&
    isString(field(value, "resets_at"))
  );
}

function isClaudeQuota(value: unknown): value is ClaudeQuota {
  if (!isObject(value)) return false;
  const windows = field(value, "windows");
  return Array.isArray(windows) && windows.every(isClaudeWindow) && isString(field(value, "fetched_at"));
}

function isCodexWindow(value: unknown): boolean {
  return (
    value === null ||
    (isObject(value) &&
      isFiniteNumber(field(value, "used_percent")) &&
      isNumberOrNull(field(value, "window_minutes")) &&
      isStringOrNull(field(value, "resets_at")))
  );
}

function isCodexQuota(value: unknown): value is CodexQuota {
  return (
    isObject(value) &&
    isStringOrNull(field(value, "plan_type")) &&
    isBoolOrNull(field(value, "ordinary_usage_allowed")) &&
    isStringOrNull(field(value, "rate_limit_reached_type")) &&
    isFiniteNumber(field(value, "reset_credits_available")) &&
    isCodexWindow(field(value, "primary")) &&
    isCodexWindow(field(value, "secondary")) &&
    isString(field(value, "fetched_at"))
  );
}

function isQuota(value: unknown): value is Quota {
  if (!isObject(value)) return false;
  const claude = field(value, "claude");
  const codex = field(value, "codex");
  return (
    (isQuotaError(claude) || isClaudeQuota(claude)) && (isQuotaError(codex) || isCodexQuota(codex))
  );
}

export async function fetchQuota(refresh: boolean): Promise<Quota> {
  const response = await fetch(refresh ? "/api/quota?refresh=1" : "/api/quota");
  if (!response.ok) {
    throw new Error(`Could not load quota (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!isQuota(body)) {
    throw new Error("Could not load quota (unexpected response)");
  }
  return body;
}
```

- [ ] **Step 4: store and hook.** `quota/quotaStore.ts`:

```ts
import { fetchQuota, type Quota } from "./api";

export type QuotaSnapshot =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; quota: Quota; error: string | null };
export type QuotaState = { snapshot: QuotaSnapshot; pending: boolean };

// simplified: one module-level store so the strip and the page share a single request and the
// last answer; replace with a query cache when a second kind of server data needs one.
const initial: QuotaState = { snapshot: { status: "loading" }, pending: false };
let state: QuotaState = initial;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: QuotaState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export const getQuotaState = (): QuotaState => state;

export function subscribeQuota(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function loadQuota(refresh: boolean): Promise<void> {
  if (inflight !== null) return inflight;
  set({ ...state, pending: true });
  inflight = fetchQuota(refresh)
    .then(
      (quota) => set({ snapshot: { status: "ok", quota, error: null }, pending: false }),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const previous = state.snapshot;
        set({
          snapshot:
            previous.status === "ok" ? { ...previous, error: message } : { status: "error", message },
          pending: false,
        });
      },
    )
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function resetQuotaStore(): void {
  state = initial;
  inflight = null;
}
```

`quota/useQuota.ts`:

```ts
import { useSyncExternalStore } from "react";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { getQuotaState, loadQuota, subscribeQuota } from "./quotaStore";

const POLL_MS = 60_000;
const poll = () => {
  void loadQuota(false);
};
const reload = () => {
  void loadQuota(false);
};
const refresh = () => {
  void loadQuota(true);
};

export function useQuota() {
  const { snapshot, pending } = useSyncExternalStore(subscribeQuota, getQuotaState);
  useVisibleInterval(poll, POLL_MS);
  return { snapshot, pending, reload, refresh };
}
```

(`getQuotaState` returns the same object until `set` replaces it, which `useSyncExternalStore` requires.)

- [ ] **Step 5: status** `quota/status.ts`:

```ts
import { isQuotaError, type ClaudeQuota, type CodexQuota, type CodexWindow, type QuotaError } from "./api";

export type Level = "ok" | "near" | "limited" | "no-data" | "error";
export type Status = { level: Level; percent: number | null };

export const NEAR_PERCENT = 80;
export const LIMITED_PERCENT = 100;
export const LEVEL_LABEL: Record<Level, string> = {
  ok: "ok",
  near: "near the limit",
  limited: "limited",
  "no-data": "no data",
  error: "error",
};

function fromPercents(percents: number[], blocked: boolean): Status {
  const percent = percents.length > 0 ? Math.max(...percents) : null;
  if (blocked || (percent !== null && percent >= LIMITED_PERCENT)) return { level: "limited", percent };
  if (percent === null) return { level: "no-data", percent };
  if (percent >= NEAR_PERCENT) return { level: "near", percent };
  return { level: "ok", percent };
}

export function claudeStatus(side: ClaudeQuota | QuotaError): Status {
  if (isQuotaError(side)) return { level: "error", percent: null };
  return fromPercents(side.windows.map((w) => w.used_percent), false);
}

export function codexStatus(side: CodexQuota | QuotaError): Status {
  if (isQuotaError(side)) return { level: "error", percent: null };
  const windows = [side.primary, side.secondary].filter((w): w is CodexWindow => w !== null);
  return fromPercents(windows.map((w) => w.used_percent), side.ordinary_usage_allowed === false);
}
```

- [ ] **Step 6: strip** `quota/QuotaStrip.tsx` (default hidden dependency on the store only):

```tsx
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { useQuota } from "./useQuota";
import { LEVEL_LABEL, claudeStatus, codexStatus, type Level, type Status } from "./status";

const VARIANT: Record<Level, "secondary" | "outline" | "destructive"> = {
  ok: "secondary",
  near: "outline",
  limited: "destructive",
  "no-data": "outline",
  error: "destructive",
};

function Chip({ name, status }: { name: string; status: Status }) {
  const percent = status.percent === null ? "" : ` ${Math.round(status.percent)}%`;
  return (
    <Link to="/quota">
      <Badge variant={VARIANT[status.level]}>{`${name} ${LEVEL_LABEL[status.level]}${percent}`}</Badge>
    </Link>
  );
}

export function QuotaStrip() {
  const { snapshot } = useQuota();
  return (
    <section aria-label="Quota" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">Quota</span>
      {snapshot.status === "loading" && <span className="text-muted-foreground">Loading…</span>}
      {snapshot.status === "error" && (
        <span role="status" className="text-destructive">{`Quota unavailable: ${snapshot.message}`}</span>
      )}
      {snapshot.status === "ok" && (
        <>
          <Chip name="Claude" status={claudeStatus(snapshot.quota.claude)} />
          <Chip name="Codex" status={codexStatus(snapshot.quota.codex)} />
          {snapshot.error !== null && (
            <span role="status" className="text-muted-foreground">
              (refresh failed, showing the last answer)
            </span>
          )}
        </>
      )}
    </section>
  );
}
```

In `ProjectsPage.tsx` render `<QuotaStrip />` directly under the `<h1>`; in `ProjectsPage.test.tsx` add at the top, after the imports, `vi.mock("@/features/quota/QuotaStrip", () => ({ QuotaStrip: () => null }));` so the existing tests keep counting only project requests.

- [ ] **Step 7:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build`; expect all green.

### Track 4: Quota page
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-015, REQ-UI-018, REQ-UI-019, REQ-UI-021
- **Files**: create `frontend/src/lib/useNow.ts`, `frontend/src/features/quota/{format.ts,ProgressBar.tsx,ClaudeCard.tsx,CodexCard.tsx,QuotaPage.tsx}`, `format.test.ts`, `QuotaPage.test.tsx`; modify `frontend/src/app/Layout.tsx`, `frontend/src/app/App.tsx`, `frontend/src/app/App.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-015, 018, 019 and 021 has a vitest test; progress bars are `role="progressbar"` with text values; the Refresh button sends `refresh=1` and is disabled while pending; raw command text is shown only in a closed `<details>` as plain text; no new dependency.
- **Estimated complexity**: medium

Interfaces consumed: Track 3. Produced: `formatWindow(minutes)`, `formatAge(fromIso, nowMs)`, `formatTimes(iso)`, `useNow(intervalMs)`, `ProgressBar`, `ClaudeCard`, `CodexCard`, `QuotaPage`.

- [ ] **Step 1: failing tests.** `frontend/src/features/quota/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatAge, formatTimes, formatWindow } from "./format";

const NOW = Date.parse("2026-10-15T03:00:00Z");

describe("format", () => {
  // REQ-UI-019
  it("REQ-UI-019 names a window length in hours or days", () => {
    expect(formatWindow(300)).toBe("5 hours");
    expect(formatWindow(10080)).toBe("7 days");
    expect(formatWindow(43200)).toBe("30 days");
    expect(formatWindow(60)).toBe("1 hour");
    expect(formatWindow(90)).toBe("90 minutes");
    expect(formatWindow(null)).toBe("unknown length");
  });

  // REQ-UI-018
  it("REQ-UI-018 says how long ago the data was fetched", () => {
    const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();
    expect(formatAge(ago(10), NOW)).toBe("just now");
    expect(formatAge(ago(180), NOW)).toBe("3 minutes ago");
    expect(formatAge(ago(7200), NOW)).toBe("2 hours ago");
    expect(formatAge(ago(3 * 86400), NOW)).toBe("3 days ago");
    expect(formatAge(ago(-500), NOW)).toBe("just now");
    expect(formatAge("garbage", NOW)).toBe("just now");
  });

  // REQ-UI-018
  it("REQ-UI-018 shows a reset time in local time and in UTC", () => {
    expect(formatTimes("2026-10-15T08:00:00Z")).toContain("2026-10-15 08:00 UTC");
    expect(formatTimes("nonsense")).toBe("nonsense");
  });
});
```

`frontend/src/features/quota/QuotaPage.test.tsx` (REQ-UI-018, 019, 021):

```tsx
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claudeQuota, codexQuota, json, quota } from "./quotaFixtures";
import { resetQuotaStore } from "./quotaStore";
import { QuotaPage } from "./QuotaPage";

const answer = (make: () => Response) =>
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(make())));

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("QuotaPage", () => {
  // REQ-UI-018
  it("REQ-UI-018 shows each Claude window with a progress bar and its reset time", async () => {
    answer(() => json(quota()));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Claude" });
    const session = within(card).getByRole("progressbar", { name: "session" });
    expect(session).toHaveAttribute("aria-valuenow", "41");
    expect(within(card).getByRole("progressbar", { name: "week (all models)" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(within(card).getByText("41%")).toBeInTheDocument();
    expect(within(card).getAllByText(/2026-10-20 12:00 UTC/)).not.toHaveLength(0);
  });

  // REQ-UI-018
  it("REQ-UI-018 says how long ago the usage was fetched", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T03:03:00Z"));
    answer(() => json(quota()));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Claude" });
    expect(within(card).getByText(/Updated 3 minutes ago/)).toBeInTheDocument();
  });

  // REQ-UI-018
  it("REQ-UI-018 Refresh sends refresh=1 and is disabled until the answer arrives", async () => {
    let release: (response: Response) => void = () => undefined;
    const later = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota())))
      .mockImplementationOnce(() => later);
    vi.stubGlobal("fetch", fetchMock);
    render(<QuotaPage />);
    const button = await screen.findByRole("button", { name: "Refresh" });
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/quota?refresh=1");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    await act(async () => {
      release(json(quota(claudeQuota(70))));
      await later;
    });
    expect(await screen.findByText("70%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });

  // REQ-UI-018
  it("REQ-UI-018 keeps raw command text in a closed details element as plain text", async () => {
    const raw = "<script>window.hacked = 1</script> API key login";
    answer(() => json(quota({ error: "claude /usage output was not understood", raw })));
    const { container } = render(<QuotaPage />);
    expect(await screen.findByText(/was not understood/)).toBeInTheDocument();
    expect(screen.getByText(raw).closest("details")).toHaveProperty("open", false);
    expect(container.querySelector("script")).toBeNull();
  });

  // REQ-UI-019
  it("REQ-UI-019 shows the plan, a 30-day window and the reset credits", async () => {
    const codex = codexQuota({
      plan_type: "free",
      reset_credits_available: 2,
      primary: { used_percent: 0, window_minutes: 43200, resets_at: "2026-11-06T06:50:12Z" },
    });
    answer(() => json(quota(claudeQuota(41), codex)));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Codex" });
    expect(within(card).getByText(/free/)).toBeInTheDocument();
    expect(within(card).getByRole("progressbar", { name: "30 days" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(within(card).getByText(/2 reset credits available/)).toBeInTheDocument();
    expect(within(card).getByText(/2026-11-06 06:50 UTC/)).toBeInTheDocument();
  });

  // REQ-UI-019
  it("REQ-UI-019 shows two windows by length", async () => {
    const codex = codexQuota({
      secondary: { used_percent: 40, window_minutes: 10080, resets_at: null },
    });
    answer(() => json(quota(claudeQuota(41), codex)));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Codex" });
    expect(within(card).getByRole("progressbar", { name: "5 hours" })).toHaveAttribute("aria-valuenow", "16");
    expect(within(card).getByRole("progressbar", { name: "7 days" })).toHaveAttribute("aria-valuenow", "40");
  });

  // REQ-UI-019
  it("REQ-UI-019 says when the limit has been reached", async () => {
    const codex = codexQuota({ ordinary_usage_allowed: false, rate_limit_reached_type: "rate_limit_reached" });
    answer(() => json(quota(claudeQuota(41), codex)));
    render(<QuotaPage />);
    expect(await screen.findByText(/limit has been reached/i)).toBeInTheDocument();
  });

  // REQ-UI-019
  it("REQ-UI-019 says when Codex reported no window", async () => {
    answer(() => json(quota(claudeQuota(41), codexQuota({ primary: null }))));
    render(<QuotaPage />);
    expect(await screen.findByText(/no rate-limit window/i)).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 shows one side's error and still shows the other card", async () => {
    answer(() => json(quota(claudeQuota(41), { error: "codex command not found" })));
    render(<QuotaPage />);
    expect(await screen.findByText("codex command not found")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "session" })).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 shows an error with Retry for a failed request and recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json({}, 500)))
      .mockImplementation(() => Promise.resolve(json(quota())));
    vi.stubGlobal("fetch", fetchMock);
    render(<QuotaPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("progressbar", { name: "session" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 shows an error, not a blank page, for an unexpected response", async () => {
    answer(() => json({ claude: "x", codex: null }));
    render(<QuotaPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected response/);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
```

Append to `frontend/src/app/App.test.tsx` (REQ-UI-015), reusing the file's `json` helper and cleanup hooks:

```tsx
  // REQ-UI-015
  it("REQ-UI-015 opens the quota page from the sidebar without a reload and follows back", async () => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(url.includes("/api/quota") ? json(quota()) : json([])),
      ),
    );
    render(<App />);
    await screen.findByText(/no projects configured/i);
    await userEvent.click(screen.getByRole("link", { name: "Quota" }));
    expect(window.location.pathname).toBe("/quota");
    expect(await screen.findByRole("heading", { name: "Quota" })).toBeInTheDocument();
    act(() => window.history.back());
    await screen.findByText(/no projects configured/i);
    expect(window.location.pathname).toBe("/");
  });
```

(import `quota` from `@/features/quota/quotaFixtures` and call `resetQuotaStore()` in the file's `beforeEach`; on the Projects page the strip also renders a `Quota` link per chip whose names start with `Claude`/`Codex`, so the sidebar link named exactly `Quota` is unambiguous.) Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: formatting helpers** `quota/format.ts`:

```ts
export function formatWindow(minutes: number | null): string {
  if (minutes === null) return "unknown length";
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (minutes % 1440 === 0) return plural(minutes / 1440, "day");
  if (minutes % 60 === 0) return plural(minutes / 60, "hour");
  return plural(minutes, "minute");
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });

export function formatAge(fromIso: string, nowMs: number): string {
  const seconds = Math.round((nowMs - Date.parse(fromIso)) / 1000);
  if (!Number.isFinite(seconds) || seconds < 45) return "just now";
  if (seconds < 3600) return relative.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86_400) return relative.format(-Math.round(seconds / 3600), "hour");
  return relative.format(-Math.round(seconds / 86_400), "day");
}

/** Local time, then the same instant in UTC, for a reset time. */
export function formatTimes(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const utc = `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  return `${date.toLocaleString()} (${utc})`;
}
```

`lib/useNow.ts` (the age text re-renders without the render reading the clock):

```ts
import { useCallback, useState } from "react";
import { useVisibleInterval } from "./useVisibleInterval";

/** The current time in ms, refreshed every `ms` while the page is visible. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  const tick = useCallback(() => setNow(Date.now()), []);
  useVisibleInterval(tick, ms);
  return now;
}
```

`ProgressBar.tsx`:

```tsx
export function ProgressBar({ label, percent }: { label: string; percent: number }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="h-2 w-40 overflow-hidden rounded bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="text-sm tabular-nums">{`${Math.round(percent)}%`}</span>
    </div>
  );
}
```

- [ ] **Step 3: cards.** `ClaudeCard.tsx` takes `{ side: ClaudeQuota | QuotaError; pending: boolean; onRefresh: () => void }`: heading `Claude`; for a `ClaudeQuota`: one row per window with the label, a `ProgressBar` named by the label, and `formatTimes(window.resets_at)`; `Updated {formatAge(side.fetched_at, now)}` (with `useNow(30_000)`); a `Refresh` button (`disabled={pending}`, `onClick={onRefresh}`); for a `QuotaError`: the message in `text-destructive`, the `Refresh` button too, and, when `side.raw` is a string, `<details><summary>Raw output</summary><pre className="whitespace-pre-wrap break-words">{side.raw}</pre></details>` (text child only). `CodexCard.tsx` takes `{ side: CodexQuota | QuotaError }`: heading `Codex`, plan (`side.plan_type`), for each present window (`primary`, `secondary`) the `formatWindow(window.window_minutes)` as the label, a `ProgressBar`, and `formatTimes(window.resets_at)` when present; `${n} reset credit${n === 1 ? "" : "s"} available` when `n > 0`; "No rate-limit window reported." when both windows are null; "The Codex limit has been reached." when `ordinary_usage_allowed === false` or `rate_limit_reached_type !== null`; `Updated …` as above; the error message for a `QuotaError`. Both cards are `<section aria-label="Claude">` / `"Codex"` with `rounded-lg border p-4` and use `isQuotaError` to choose the branch.

- [ ] **Step 4: page** `QuotaPage.tsx`:

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClaudeCard } from "./ClaudeCard";
import { CodexCard } from "./CodexCard";
import { useQuota } from "./useQuota";

export function QuotaPage() {
  const { snapshot, pending, reload, refresh } = useQuota();
  const errorMessage =
    snapshot.status === "error" ? snapshot.message : snapshot.status === "ok" ? snapshot.error : null;
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Quota</h1>
      {snapshot.status === "loading" && <p className="text-muted-foreground">Loading quota…</p>}
      {errorMessage !== null && (
        <Alert variant="destructive">
          <AlertTitle>Quota could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{errorMessage}</span>
            <Button variant="outline" size="sm" disabled={pending} onClick={reload}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {snapshot.status === "ok" && (
        <div className="grid gap-4 md:grid-cols-2">
          <ClaudeCard side={snapshot.quota.claude} pending={pending} onRefresh={refresh} />
          <CodexCard side={snapshot.quota.codex} />
        </div>
      )}
    </section>
  );
}
```

`Layout.tsx`: add a third `Link to="/quota"` "Quota" in the nav, active when `pathname === "/quota"` (same classes as the other links). `App.tsx`: render `<QuotaPage />` when `pathname === "/quota"` (before the Projects fallback; keep the existing `/sessions` routes).

- [ ] **Step 5:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build && uv --directory backend run pytest -q`; expect all green.

## Integration
- **Branch**: `feat/gin-console-rm-quota` (one worktree for the epic)
- **Merge strategy**: sequential

## Validation
- [ ] `uv --directory backend run pytest`, `ruff check .`, `mypy` clean
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` clean
- [ ] Every REQ-ID of the delta appears in at least one test (`gin-workflow specs trace --change gin-console-rm-quota`)
- [ ] Manual, in a shell (PATH of the interactive user): `curl -s 127.0.0.1:8700/api/quota` after `pnpm -C frontend build` and a restart shows Claude `windows` equal to what `claude -p /usage --no-session-persistence` prints and the Codex plan and window equal to what the app server answers; the Quota page shows the same, "Refresh" updates `Updated … ago`, the strip appears on the Projects page
- [ ] Manual, as the real service: this only works once bug `gin-console-l9u` is fixed (see Notes); check `GET /api/quota` on the running service shows data on both sides, not "command not found"

## Notes
- Model guidance is planning metadata, not Beads state.
- **Deployment PATH (bug `gin-console-l9u`)**: the installed systemd unit runs with `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin`. On this host `claude` and `gin-workflow` live in `~/.local/bin`, `codex` in `~/.npm-global/bin` and `bd` in `/home/linuxbrew/.linuxbrew/bin`, so under the service none resolves (verified with `env -i` and that PATH). `claude` is found by the `~/.local/bin` fallback; `codex` is not. The same defect already affects the shipped projects dashboard. It is fixed separately (a `PATH` line in `deploy/gin-console.service`, the install doc, and a restart); do not work around it inside this change.
- The Codex app server is marked experimental by the CLI and `/usage` prints text meant for people: both can change between versions; the code reports a changed format as an error (with the raw text for Claude) instead of guessing.
- In the Docker image `~/.claude` and `~/.codex` are mounted read-only, so either CLI may be unable to refresh its login token there.
- `/usage` is a local command (no model call, about 4 s) and the app server answers in about 1 s; both run in parallel in the endpoint, each at most once per 5 minutes unless Refresh is used.
- The status `limited` for Claude comes only from the percentage reaching 100; the CLI offers no separate "limited" flag in `/usage`.
