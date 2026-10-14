"""Claude sessions on this host; the only module that knows Claude's undocumented formats."""

import json
import re
import shlex
from collections.abc import Iterable, Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from gin_console.config import ProjectEntry, Settings
from gin_console.sessions.models import Block, Message, MessagePage, SessionSummary

EDGE_BYTES = 64 * 1024
WORKTREE_INFIX = "--planning-worktrees-"
_ENCODE = str.maketrans({"/": "-", ".": "-"})
_SESSION_ID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def _is_session_id(value: str) -> bool:
    return _SESSION_ID.fullmatch(value) is not None


def project_dirs(claude_home: Path, entry: ProjectEntry) -> list[Path]:
    root = claude_home / "projects"
    if not root.is_dir():
        return []
    base = str(entry.path).translate(_ENCODE)
    return sorted(
        d
        for d in root.iterdir()
        if d.is_dir() and (d.name == base or d.name.startswith(base + WORKTREE_INFIX))
    )


def live_sessions(claude_home: Path) -> dict[str, dict[str, Any]]:
    """Registry records of running sessions, by session id."""
    live: dict[str, dict[str, Any]] = {}
    for registry in (claude_home / "sessions").glob("*.json"):
        try:
            record = json.loads(registry.read_text())
        except (OSError, ValueError, RecursionError):
            continue
        if not isinstance(record, dict):
            continue
        pid, session_id = record.get("pid"), record.get("sessionId")
        if type(pid) is int and isinstance(session_id, str) and Path(f"/proc/{pid}").exists():
            live[session_id] = record
    return live


def _records(chunk: bytes) -> Iterator[dict[str, Any]]:
    for line in chunk.split(b"\n"):
        try:
            record = json.loads(line)
        except (ValueError, RecursionError):  # cut by the chunk edge, not JSON, or too deep
            continue
        if isinstance(record, dict):
            yield record


def _last_title(records: Iterable[dict[str, Any]]) -> str | None:
    title = None
    for record in records:
        value = record.get("aiTitle")
        if record.get("type") == "ai-title" and isinstance(value, str) and value.strip():
            title = value
    return title


def _first_user_text(records: Iterable[dict[str, Any]]) -> str | None:
    for record in records:
        if record.get("type") != "user" or record.get("isMeta"):
            continue
        message = record.get("message")
        content = message.get("content") if isinstance(message, dict) else None
        text: Any = content
        if isinstance(content, list):
            text = next(
                (b.get("text") for b in content if isinstance(b, dict) and b.get("type") == "text"),
                None,
            )
        if isinstance(text, str) and text.strip():
            return text.strip()[:80]
    return None


def _text(value: Any) -> str | None:
    return value if isinstance(value, str) else None


def _resume_command(session_id: str, cwd: str | None) -> str:
    resume = f"claude --resume {session_id}"
    return f"cd {shlex.quote(cwd)} && {resume}" if cwd else resume


def _summarize(path: Path, project: str, live: dict[str, dict[str, Any]]) -> SessionSummary:
    stat = path.stat()
    with path.open("rb") as handle:
        head = handle.read(EDGE_BYTES)
        if stat.st_size > EDGE_BYTES:
            handle.seek(stat.st_size - EDGE_BYTES)
            tail = handle.read()
        else:
            tail = head
    head_records = list(_records(head))
    title = (
        _last_title(_records(tail))
        or _last_title(head_records)
        or _first_user_text(head_records)
        or path.stem
    )
    cwd = next((r["cwd"] for r in head_records if isinstance(r.get("cwd"), str)), None)
    registry = live.get(path.stem)
    return SessionSummary(
        id=path.stem,
        project=project,
        title=title,
        cwd=cwd,
        modified=datetime.fromtimestamp(stat.st_mtime, tz=UTC),
        size=stat.st_size,
        live=registry is not None,
        name=_text(registry.get("name")) if registry else None,
        status=_text(registry.get("status")) if registry else None,
        kind=_text(registry.get("kind")) if registry else None,
        resume_command=_resume_command(path.stem, cwd),
    )


def list_sessions(
    settings: Settings, claude_home: Path, project: str | None
) -> list[SessionSummary]:
    live = live_sessions(claude_home)
    sessions: list[SessionSummary] = []
    for entry in settings.projects:
        if project is not None and entry.name != project:
            continue
        for directory in project_dirs(claude_home, entry):
            for path in directory.glob("*.jsonl"):
                if not _is_session_id(path.stem):
                    continue
                try:
                    sessions.append(_summarize(path, entry.name, live))
                except OSError:  # vanished or unreadable: leave it out of the list
                    continue
    sessions.sort(key=lambda s: (not s.live, -s.modified.timestamp()))
    return sessions


MAX_TEXT = 20_000


def find_transcript(claude_home: Path, entry: ProjectEntry, session_id: str) -> Path | None:
    if not _is_session_id(session_id):  # also rules out path separators and ".."
        return None
    for directory in project_dirs(claude_home, entry):
        path = directory / f"{session_id}.jsonl"
        if path.is_file():
            return path
    return None


def _cut(text: str) -> tuple[str, bool]:
    return (text[:MAX_TEXT], True) if len(text) > MAX_TEXT else (text, False)


def _result_text(content: Any) -> str | None:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [
            p["text"]
            for p in content
            if isinstance(p, dict) and p.get("type") == "text" and isinstance(p.get("text"), str)
        ]
        return "\n".join(parts)
    return None


def _block(raw: Any) -> Block | None:
    if not isinstance(raw, dict):
        return None
    kind = raw.get("type")
    body: Any
    if kind == "text":
        body = raw.get("text")
    elif kind == "thinking":
        body = raw.get("thinking")
    elif kind == "tool_use":
        try:
            body = json.dumps(raw.get("input"), separators=(",", ":"), ensure_ascii=False)
        except (TypeError, ValueError, RecursionError):
            return None
    elif kind == "tool_result":
        body = _result_text(raw.get("content"))
    else:
        return None
    if not isinstance(body, str):
        return None
    text, truncated = _cut(body)
    if kind == "tool_use":
        return Block(type=kind, name=str(raw.get("name", "")), input=text, truncated=truncated)
    return Block(type=kind, text=text, truncated=truncated)


def _message(line: str) -> Message | None:
    try:
        record = json.loads(line)
    except (ValueError, RecursionError):
        return None
    if not isinstance(record, dict) or record.get("type") not in ("user", "assistant"):
        return None
    message = record.get("message")
    content = message.get("content") if isinstance(message, dict) else None
    raw_blocks = [{"type": "text", "text": content}] if isinstance(content, str) else content
    blocks = [b for b in map(_block, raw_blocks) if b] if isinstance(raw_blocks, list) else []
    return Message(role=record["type"], blocks=blocks) if blocks else None


# simplified: every page re-reads the file from line 0; add an offset index only if a
# transcript grows past tens of MB.
def read_messages(path: Path, offset: int, limit: int) -> MessagePage:
    items: list[Message] = []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for number, line in enumerate(handle):
            if number < offset:
                continue
            if len(items) == limit:
                return MessagePage(items=items, next_offset=number)
            message = _message(line)
            if message is not None:
                items.append(message)
    return MessagePage(items=items, next_offset=None)
