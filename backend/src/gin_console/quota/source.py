"""Claude and Codex quota; the only module that knows how each CLI reports it."""

import json
import os
import re
import select
import shutil
import signal
import subprocess
import tempfile
import time
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from importlib.metadata import version
from pathlib import Path
from typing import Any, TypeGuard

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
                errors="replace",
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
                # own process group: `codex` may be a wrapper that runs the real server as a child
                start_new_session=True,
            )
        except OSError as exc:
            raise SourceError(f"codex failed: {exc.strerror}") from None
        try:
            return _codex_conversation(process, deadline)
        finally:
            _end(process)


def _end(process: "subprocess.Popen[bytes]") -> None:
    """End the server and everything it started, whatever state the conversation was in."""
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError):  # the group is already gone
        process.kill()
    for pipe in (process.stdin, process.stdout):
        if pipe is not None:
            pipe.close()
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
                if _is_answer(message, request_id):
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


def _is_answer(message: Any, request_id: int) -> TypeGuard[dict[str, Any]]:
    """A reply to our request: not a request or notification of the server, and a real int id."""
    return (
        isinstance(message, dict)
        and "method" not in message
        and type(message.get("id")) is int
        and message["id"] == request_id
    )


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
