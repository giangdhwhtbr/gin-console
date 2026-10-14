"""Build a fake ~/.claude for the sessions tests."""

import json
import os
from pathlib import Path
from typing import Any

A = "11111111-1111-4111-8111-111111111111"
B = "22222222-2222-4222-8222-222222222222"
C = "33333333-3333-4333-8333-333333333333"
DEAD_PID = 999_999_999  # above any pid_max, never in /proc


def make_home(tmp_path: Path) -> Path:
    home = tmp_path / "claude"
    (home / "projects").mkdir(parents=True)
    (home / "sessions").mkdir()
    return home


def write_transcript(
    home: Path,
    dirname: str,
    session_id: str,
    records: list[dict[str, Any] | str],
    mtime: float | None = None,
) -> Path:
    directory = home / "projects" / dirname
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{session_id}.jsonl"
    lines = [record if isinstance(record, str) else json.dumps(record) for record in records]
    path.write_text("\n".join(lines) + ("\n" if lines else ""))
    if mtime is not None:
        os.utime(path, (mtime, mtime))
    return path


def write_live(home: Path, pid: int, session_id: str, **extra: Any) -> None:
    record = {"pid": pid, "sessionId": session_id, **extra}
    (home / "sessions" / f"{pid}.json").write_text(json.dumps(record))
