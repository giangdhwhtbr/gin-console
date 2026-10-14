"""Claude sessions on this host; the only module that knows Claude's undocumented formats."""

import json
import re
import shlex
from collections.abc import Iterable, Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from gin_console.config import ProjectEntry, Settings
from gin_console.sessions.models import SessionSummary

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
        except (OSError, ValueError):
            continue
        pid, session_id = record.get("pid"), record.get("sessionId")
        if isinstance(pid, int) and isinstance(session_id, str) and Path(f"/proc/{pid}").exists():
            live[session_id] = record
    return live


def _records(chunk: bytes) -> Iterator[dict[str, Any]]:
    for line in chunk.split(b"\n"):
        try:
            record = json.loads(line)
        except ValueError:  # a line cut by the chunk edge, or not JSON
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
        name=registry.get("name") if registry else None,
        status=registry.get("status") if registry else None,
        kind=registry.get("kind") if registry else None,
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
