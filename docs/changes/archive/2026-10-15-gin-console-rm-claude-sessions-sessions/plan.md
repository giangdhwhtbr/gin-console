# Plan: Claude sessions

Epic: gin-console-rm-claude-sessions
Spec: docs/changes/gin-console-rm-claude-sessions-sessions/ (proposal.md, spec-delta.md, design.md, tests.md)

## Objective

A Sessions page that lists the Claude sessions of every configured project (worktree sessions included, live ones first), a log page that reads a transcript in pages with tool calls collapsed, and a "Copy resume" action that puts `cd <cwd> && claude --resume <id>` on the clipboard. Everything read-only.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: list the Claude sessions of every configured project, read their logs read-only, and jump back to the native tool to continue.
- Architecture: a new backend context `sessions/` next to `projects/`. `source.py` is the only module that knows Claude's undocumented formats (directory encoding, `.jsonl` records, `~/.claude/sessions/<pid>.json`) and returns the console's own pydantic models. The React side adds a Sessions list page and a log page with history-API routing and no new dependency.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Read-only: the console never writes to or deletes any Claude file; the transcript is located only inside the project directories (REQ-SESSIONS-001/008).
- Single machine, Tailscale-only access; no authentication.
- Non-goals: web chat, writing or deleting sessions, search inside logs, Codex and Antigravity sessions, Remote Control links, a message count or cache index.
- Transcript text is rendered as plain text only; no Markdown or HTML from transcripts.
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
- Problem statement: the console shows project state but not the Claude sessions behind it.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; on the live host the Sessions page lists this project's sessions (the current one live), a log opens, and the copied command resumes a session.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Read on demand, page by line number (selected in discuss)
- Summary: the list uses `stat` plus the first and last 64 KiB of each file; the log iterates lines from an offset and returns 100 items.
- Pros: no index, no state between requests, nothing to invalidate.
- Cons: every page re-reads the file from the start (O(size)); the list reads two chunks per file on every poll.

### Option 2: Scan once and cache an index
- Summary: build message counts and offsets, cache by (path, mtime).
- Pros: counts and fast seeks.
- Cons: invalidation logic nobody asked for.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss; transcripts only grow at the end and no aggregate is required.

## Scope
- In scope: REQ-SESSIONS-001..008, REQ-UI-008..014.
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four tracks in a dependency chain (list API, messages API, list UI, log UI); each needs the previous one's interface, so one agent working in order is simplest.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/sessions/__init__.py` (create) | package marker | 1 |
| `backend/src/gin_console/sessions/models.py` (create) | `SessionSummary`, `Block`, `Message`, `MessagePage` | 1, 2 |
| `backend/src/gin_console/sessions/source.py` (create) | directory mapping, live registry, summaries, transcript lookup, message paging | 1, 2 |
| `backend/src/gin_console/sessions/router.py` (create) | `GET /api/sessions`, `GET /api/sessions/{project}/{id}/messages` | 1, 2 |
| `backend/src/gin_console/app.py` (modify) | include the router; `claude_home` parameter | 1 |
| `backend/tests/claude_home.py` (create) | build a fake Claude home | 1 |
| `backend/tests/test_sessions_list.py` (create) | REQ-SESSIONS-001..005 | 1 |
| `backend/tests/test_sessions_messages.py` (create) | REQ-SESSIONS-006..008 | 2 |
| `frontend/src/lib/useVisibleInterval.ts` (create) | shared "run now and every N ms while visible" hook | 3 |
| `frontend/src/features/projects/ProjectsPage.tsx` (modify) | use the shared hook | 3 |
| `frontend/src/app/route.ts` (create) | `navigate`, `useLocation` | 3 |
| `frontend/src/app/Link.tsx` (create) | in-app link | 3 |
| `frontend/src/app/Layout.tsx`, `App.tsx` (modify) | Sessions link, route switch | 3, 4 |
| `frontend/src/app/App.test.tsx` (create) | routing tests | 3 |
| `frontend/src/features/sessions/api.ts` (create) | types, guards, fetchers | 3, 4 |
| `frontend/src/features/sessions/CopyResumeButton.tsx` (create) | copy with fallback | 3 |
| `frontend/src/features/sessions/SessionsPage.tsx` (create) | list, filter, refresh | 3 |
| `frontend/src/features/sessions/SessionsPage.test.tsx` (create) | UI tests | 3 |
| `frontend/src/features/sessions/BlockView.tsx`, `MessageView.tsx` (create) | one message / one block | 4 |
| `frontend/src/features/sessions/SessionLogPage.tsx` (create) | log page | 4 |
| `frontend/src/features/sessions/SessionLogPage.test.tsx` (create) | UI tests | 4 |

## Tasks

### Track 1: Session list API
- **Dependencies**: none
- **Requirements**: REQ-SESSIONS-001, REQ-SESSIONS-002, REQ-SESSIONS-003, REQ-SESSIONS-004, REQ-SESSIONS-005
- **Files**: create `backend/src/gin_console/sessions/{__init__,models,source,router}.py`, `backend/tests/claude_home.py`, `backend/tests/test_sessions_list.py`; modify `backend/src/gin_console/app.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the five REQs has a passing test; look-alike directories are not matched; a stale registry record is not live; an unknown project gives 404.
- **Estimated complexity**: medium

Interfaces produced: `list_sessions(settings: Settings, claude_home: Path, project: str | None) -> list[SessionSummary]`, `project_dirs(claude_home: Path, entry: ProjectEntry) -> list[Path]`, `build_router(settings: Settings, claude_home: Path) -> APIRouter`, `create_app(settings, static_dir=..., claude_home=DEFAULT_CLAUDE_HOME)`.

- [ ] **Step 1: test helper** `backend/tests/claude_home.py`:

```python
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
```

- [ ] **Step 2: failing tests** `backend/tests/test_sessions_list.py`:

```python
import os
from pathlib import Path

import pytest
from claude_home import A, B, C, DEAD_PID, make_home, write_live, write_transcript
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.sessions.source import list_sessions

QWIK = ProjectEntry(name="qwikfone", path=Path("/home/gin/qwikfone"))
GIN = ProjectEntry(name="gin", path=Path("/home/gin/gin"))
GIN_CONSOLE = ProjectEntry(name="gin-console", path=Path("/home/gin/gin-console"))


def settings(*projects: ProjectEntry) -> Settings:
    return Settings(projects=list(projects))


# REQ-SESSIONS-001
def test_sessions_001_main_and_worktree_dirs(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-qwikfone", A, [])
    write_transcript(home, "-home-gin-qwikfone--planning-worktrees-qwikfone-cp1g", B, [])
    write_transcript(home, "-home-gin-qwikfone--agent-workflow-runtime-health-probe-claude", C, [])
    found = list_sessions(settings(QWIK), home, None)
    assert {s.id for s in found} == {A, B}


# REQ-SESSIONS-001
def test_sessions_001_similar_names_do_not_match(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-gin-console", A, [])
    assert list_sessions(settings(GIN, GIN_CONSOLE), home, "gin") == []
    assert [s.id for s in list_sessions(settings(GIN, GIN_CONSOLE), home, "gin-console")] == [A]


# REQ-SESSIONS-002
def test_sessions_002_all_projects_carry_project_name(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-qwikfone", A, [])
    write_transcript(home, "-home-gin-gin-console", B, [])
    found = list_sessions(settings(QWIK, GIN_CONSOLE), home, None)
    assert {(s.id, s.project) for s in found} == {(A, "qwikfone"), (B, "gin-console")}


# REQ-SESSIONS-002
def test_sessions_002_live_first_then_newest(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-qwikfone", A, [], mtime=1_000)  # oldest, live
    write_transcript(home, "-home-gin-qwikfone", B, [], mtime=2_000)  # older
    write_transcript(home, "-home-gin-qwikfone", C, [], mtime=3_000)  # newest
    write_live(home, os.getpid(), A)
    assert [s.id for s in list_sessions(settings(QWIK), home, "qwikfone")] == [A, C, B]


# REQ-SESSIONS-002
def test_sessions_002_fields_and_non_uuid_files(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    path = write_transcript(home, "-home-gin-qwikfone", A, [{"type": "user", "cwd": "/x"}])
    write_transcript(home, "-home-gin-qwikfone", "not-a-session", [])
    (session,) = list_sessions(settings(QWIK), home, None)
    assert session.size == path.stat().st_size
    assert session.modified.tzinfo is not None
    assert session.cwd == "/x"


# REQ-SESSIONS-002
def test_sessions_002_unknown_project_is_404(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    static = tmp_path / "dist"
    static.mkdir()
    client = TestClient(create_app(settings(QWIK), static_dir=static, claude_home=home))
    assert client.get("/api/sessions", params={"project": "nope"}).status_code == 404
    assert client.get("/api/sessions", params={"project": "qwikfone"}).json() == []


# REQ-SESSIONS-003
def test_sessions_003_last_ai_title_wins(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        "-home-gin-qwikfone",
        A,
        [{"type": "ai-title", "aiTitle": "first"}, {"type": "ai-title", "aiTitle": "second"}],
    )
    assert list_sessions(settings(QWIK), home, None)[0].title == "second"


# REQ-SESSIONS-003
def test_sessions_003_title_is_read_from_the_end_of_a_large_file(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    filler = {"type": "attachment", "pad": "x" * 1000}
    records: list[dict[str, object] | str] = [{"type": "ai-title", "aiTitle": "early"}]
    records += [filler] * 200  # about 200 KB, more than both 64 KiB edges together
    records.append({"type": "ai-title", "aiTitle": "late"})
    write_transcript(home, "-home-gin-qwikfone", A, records)
    assert list_sessions(settings(QWIK), home, None)[0].title == "late"


# REQ-SESSIONS-003
def test_sessions_003_falls_back_to_first_user_text(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        "-home-gin-qwikfone",
        A,
        [
            {"type": "user", "isMeta": True, "message": {"content": "caveat"}},
            {"type": "user", "message": {"content": [{"type": "text", "text": "fix the bug"}]}},
        ],
    )
    assert list_sessions(settings(QWIK), home, None)[0].title == "fix the bug"


# REQ-SESSIONS-003
def test_sessions_003_falls_back_to_the_id(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-qwikfone", A, [{"type": "mode"}])
    assert list_sessions(settings(QWIK), home, None)[0].title == A


# REQ-SESSIONS-004
def test_sessions_004_running_session_is_live(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-qwikfone", A, [])
    write_live(home, os.getpid(), A, name="Full-stack", status="busy", kind="bg")
    session = list_sessions(settings(QWIK), home, None)[0]
    assert (session.live, session.name, session.status, session.kind) == (
        True,
        "Full-stack",
        "busy",
        "bg",
    )


# REQ-SESSIONS-004
def test_sessions_004_stale_record_is_ignored(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-qwikfone", A, [])
    write_live(home, DEAD_PID, A, name="old", status="busy", kind="bg")
    session = list_sessions(settings(QWIK), home, None)[0]
    assert (session.live, session.name) == (False, None)


# REQ-SESSIONS-005
@pytest.mark.parametrize(
    ("cwd", "expected"),
    [
        ("/home/gin/my project", f"cd '/home/gin/my project' && claude --resume {A}"),
        ("/home/gin/x", f"cd /home/gin/x && claude --resume {A}"),
        (None, f"claude --resume {A}"),
    ],
)
def test_sessions_005_resume_command(tmp_path: Path, cwd: str | None, expected: str) -> None:
    home = make_home(tmp_path)
    record: dict[str, object] = {"type": "user"}
    if cwd:
        record["cwd"] = cwd
    write_transcript(home, "-home-gin-qwikfone", A, [record])
    assert list_sessions(settings(QWIK), home, None)[0].resume_command == expected
```

Run `uv --directory backend run pytest tests/test_sessions_list.py -q`; expect an import error (module missing).

- [ ] **Step 3: models** `sessions/models.py` (Track 2 adds the message models to this file):

```python
from datetime import datetime

from pydantic import BaseModel


class SessionSummary(BaseModel):
    id: str
    project: str
    title: str
    cwd: str | None
    modified: datetime
    size: int
    live: bool
    name: str | None = None
    status: str | None = None
    kind: str | None = None
    resume_command: str
```

`sessions/__init__.py` stays empty.

- [ ] **Step 4: source** `sessions/source.py`:

```python
"""Claude sessions on this host; the only module that knows Claude's undocumented formats."""

import json
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
```

and, above `project_dirs`, add the id check shared with Track 2:

```python
import re

_SESSION_ID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def _is_session_id(value: str) -> bool:
    return _SESSION_ID.fullmatch(value) is not None
```

(put `import re` with the other imports.)

- [ ] **Step 5: router and app.** `sessions/router.py`:

```python
from pathlib import Path

from fastapi import APIRouter, HTTPException

from gin_console.config import Settings
from gin_console.sessions.models import SessionSummary
from gin_console.sessions.source import list_sessions


def build_router(settings: Settings, claude_home: Path) -> APIRouter:
    router = APIRouter()

    @router.get("/sessions")
    def get_sessions(project: str | None = None) -> list[SessionSummary]:
        if project is not None and all(p.name != project for p in settings.projects):
            raise HTTPException(status_code=404)
        return list_sessions(settings, claude_home, project)

    return router
```

In `app.py`: add `DEFAULT_CLAUDE_HOME = Path.home() / ".claude"`, change the signature to `create_app(settings: Settings, static_dir: Path = DEFAULT_STATIC_DIR, claude_home: Path = DEFAULT_CLAUDE_HOME)`, import `from gin_console.sessions.router import build_router as build_sessions_router`, and add `api.include_router(build_sessions_router(settings, claude_home))` right after the projects router (before the `/{rest:path}` catch-all).

- [ ] **Step 6:** run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green.

- [ ] **Step 7: real-host cost check** (the list reads two 64 KiB chunks per file on every poll): from `backend/`, run

```bash
uv run python - <<'EOF'
import time
from gin_console.config import load_settings, default_config_path
from gin_console.sessions.source import list_sessions
from pathlib import Path
s = load_settings(default_config_path()); home = Path.home() / ".claude"
t = time.time(); found = list_sessions(s, home, None)
print(len(found), "sessions", round(time.time() - t, 2), "s", [x.title for x in found if x.live])
EOF
```

Expect the three projects' sessions, this one marked live, and well under 1 s. If it is slow, record it in the track notes (`bd update <id> --notes`) and stop to ask; do not add a cache on your own.

### Track 2: Messages API
- **Dependencies**: Track 1
- **Requirements**: REQ-SESSIONS-006, REQ-SESSIONS-007, REQ-SESSIONS-008
- **Files**: modify `backend/src/gin_console/sessions/{models,source,router}.py`; create `backend/tests/test_sessions_messages.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the three REQs has a passing test; a path-like or non-UUID id never reaches the filesystem; a broken line never fails a page; the offsets add up across pages.
- **Estimated complexity**: medium

Interfaces consumed: `project_dirs`, `_is_session_id`. Produced: `find_transcript(claude_home: Path, entry: ProjectEntry, session_id: str) -> Path | None`, `read_messages(path: Path, offset: int, limit: int) -> MessagePage`, JSON `{items: [{role, blocks: [{type, text, name, input, truncated}]}], next_offset}`.

- [ ] **Step 1: failing tests** `backend/tests/test_sessions_messages.py`:

```python
import json
from pathlib import Path
from typing import Any

import pytest
from claude_home import A, B, make_home, write_transcript
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings

QWIK = ProjectEntry(name="qwikfone", path=Path("/home/gin/qwikfone"))
DIR = "-home-gin-qwikfone"


def client_for(tmp_path: Path, home: Path) -> TestClient:
    static = tmp_path / "dist"
    static.mkdir()
    return TestClient(create_app(Settings(projects=[QWIK]), static_dir=static, claude_home=home))


def messages(client: TestClient, session_id: str = A, **params: Any) -> Any:
    return client.get(f"/api/sessions/qwikfone/{session_id}/messages", params=params)


def user(text: str) -> dict[str, Any]:
    return {"type": "user", "message": {"content": text}}


def assistant(*blocks: dict[str, Any]) -> dict[str, Any]:
    return {"type": "assistant", "message": {"content": list(blocks)}}


# REQ-SESSIONS-006
def test_sessions_006_pages_add_up(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    records: list[dict[str, Any] | str] = []
    for n in range(250):
        records += [{"type": "mode"}, user(f"m{n}")]  # a non-message line between messages
    write_transcript(home, DIR, A, records)
    client = client_for(tmp_path, home)
    first = messages(client).json()
    assert len(first["items"]) == 100 and first["next_offset"] is not None
    second = messages(client, offset=first["next_offset"]).json()
    third = messages(client, offset=second["next_offset"]).json()
    assert len(second["items"]) == 100
    assert len(third["items"]) == 50 and third["next_offset"] is None
    texts = [i["blocks"][0]["text"] for p in (first, second, third) for i in p["items"]]
    assert texts == [f"m{n}" for n in range(250)]


# REQ-SESSIONS-006
def test_sessions_006_limit_is_bounded(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("x")])
    client = client_for(tmp_path, home)
    assert messages(client, limit=0).status_code == 422
    assert messages(client, limit=501).status_code == 422
    assert messages(client, offset=-1).status_code == 422


# REQ-SESSIONS-006
def test_sessions_006_other_record_types_are_not_items(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [{"type": "mode"}, {"type": "attachment"}, user("hi"), {"type": "ai-title", "aiTitle": "t"}],
    )
    items = messages(client_for(tmp_path, home)).json()["items"]
    assert [i["role"] for i in items] == ["user"]


# REQ-SESSIONS-007
def test_sessions_007_block_kinds(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home,
        DIR,
        A,
        [
            assistant(
                {"type": "thinking", "thinking": "hmm"},
                {"type": "text", "text": "hello"},
                {"type": "tool_use", "id": "t1", "name": "Bash", "input": {"command": "ls"}},
            ),
            {
                "type": "user",
                "message": {
                    "content": [
                        {"type": "tool_result", "tool_use_id": "t1", "content": "file.txt"},
                        {
                            "type": "tool_result",
                            "tool_use_id": "t1",
                            "content": [{"type": "text", "text": "a"}, {"type": "image"}],
                        },
                    ]
                },
            },
        ],
    )
    first, second = messages(client_for(tmp_path, home)).json()["items"]
    assert [b["type"] for b in first["blocks"]] == ["thinking", "text", "tool_use"]
    assert first["blocks"][0]["text"] == "hmm"
    assert first["blocks"][2]["name"] == "Bash"
    assert json.loads(first["blocks"][2]["input"]) == {"command": "ls"}
    assert [b["text"] for b in second["blocks"]] == ["file.txt", "a"]


# REQ-SESSIONS-007
def test_sessions_007_long_text_is_cut_and_marked(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(
        home, DIR, A, [{"type": "user", "message": {"content": [
            {"type": "tool_result", "tool_use_id": "t", "content": "x" * 50_000}]}}],
    )
    (block,) = messages(client_for(tmp_path, home)).json()["items"][0]["blocks"]
    assert len(block["text"]) == 20_000 and block["truncated"] is True


# REQ-SESSIONS-007
def test_sessions_007_broken_line_is_skipped_but_counted(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("one"), "{not json", user("two")])
    client = client_for(tmp_path, home)
    page = messages(client).json()
    assert [i["blocks"][0]["text"] for i in page["items"]] == ["one", "two"]
    assert messages(client, offset=1).json()["items"][0]["blocks"][0]["text"] == "two"


# REQ-SESSIONS-008
@pytest.mark.parametrize("bad_id", ["not-a-uuid", "..", "%2e%2e%2f%2e%2e%2fetc%2fpasswd"])
def test_sessions_008_bad_ids_are_404(tmp_path: Path, bad_id: str) -> None:
    home = make_home(tmp_path)
    (tmp_path / "secret.jsonl").write_text(json.dumps(user("secret")))
    assert messages(client_for(tmp_path, home), bad_id).status_code == 404


# REQ-SESSIONS-008
def test_sessions_008_unknown_project_and_missing_transcript_are_404(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, DIR, A, [user("x")])
    client = client_for(tmp_path, home)
    assert client.get(f"/api/sessions/nope/{A}/messages").status_code == 404
    assert messages(client, B).status_code == 404


# REQ-SESSIONS-008
def test_sessions_008_other_projects_directory_is_not_searched(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    write_transcript(home, "-home-gin-other", A, [user("x")])
    assert messages(client_for(tmp_path, home)).status_code == 404


# REQ-SESSIONS-008
def test_sessions_008_reading_changes_nothing(tmp_path: Path) -> None:
    home = make_home(tmp_path)
    path = write_transcript(home, DIR, A, [user("x")])
    before = (path.read_bytes(), path.stat().st_mtime_ns)
    messages(client_for(tmp_path, home))
    assert (path.read_bytes(), path.stat().st_mtime_ns) == before
```

Run `uv --directory backend run pytest tests/test_sessions_messages.py -q`; expect failures (no messages route).

- [ ] **Step 2: models.** Append to `sessions/models.py` (add `from typing import Literal` at the top):

```python
class Block(BaseModel):
    type: Literal["text", "thinking", "tool_use", "tool_result"]
    text: str | None = None
    name: str | None = None
    input: str | None = None
    truncated: bool = False


class Message(BaseModel):
    role: Literal["user", "assistant"]
    blocks: list[Block]


class MessagePage(BaseModel):
    items: list[Message]
    next_offset: int | None
```

- [ ] **Step 3: source.** Add to `sessions/source.py` (imports: `from gin_console.sessions.models import Block, Message, MessagePage, SessionSummary`):

```python
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
        body = json.dumps(raw.get("input"), separators=(",", ":"), ensure_ascii=False)
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
    except ValueError:
        return None
    if not isinstance(record, dict) or record.get("type") not in ("user", "assistant"):
        return None
    message = record.get("message")
    content = message.get("content") if isinstance(message, dict) else None
    raw_blocks = [{"type": "text", "text": content}] if isinstance(content, str) else content
    blocks = [b for b in map(_block, raw_blocks) if b] if isinstance(raw_blocks, list) else []
    return Message(role=record["type"], blocks=blocks) if blocks else None


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
```

(`ponytail`-style note for the reviewer, as a comment above `read_messages`: `# simplified: every page re-reads the file from line 0; add an offset index only if a transcript grows past tens of MB.`)

- [ ] **Step 4: route.** In `sessions/router.py` add `from fastapi import Query`, import `find_transcript`, `read_messages`, `MessagePage`, and inside `build_router`:

```python
    @router.get("/sessions/{project}/{session_id}/messages")
    def get_messages(
        project: str,
        session_id: str,
        offset: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
    ) -> MessagePage:
        entry = next((p for p in settings.projects if p.name == project), None)
        path = find_transcript(claude_home, entry, session_id) if entry else None
        if path is None:
            raise HTTPException(status_code=404)
        try:
            return read_messages(path, offset, limit)
        except OSError:  # the transcript vanished between lookup and read
            raise HTTPException(status_code=404) from None
```

- [ ] **Step 5:** run `uv --directory backend run pytest -q && uv --directory backend run ruff check . && uv --directory backend run mypy`; expect all green. Then a real-host probe: take the current session's id from `GET /api/sessions?project=gin-console` (via the same TestClient pattern as Track 1 step 7) and read its first page; expect 100 items in well under a second.

### Track 3: Routing and the Sessions list page
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-008, REQ-UI-009, REQ-UI-010, REQ-UI-011, REQ-UI-014
- **Files**: create `frontend/src/lib/useVisibleInterval.ts`, `frontend/src/app/{route.ts,Link.tsx,App.test.tsx}`, `frontend/src/features/sessions/{api.ts,CopyResumeButton.tsx,SessionsPage.tsx,SessionsPage.test.tsx}`; modify `frontend/src/features/projects/ProjectsPage.tsx`, `frontend/src/app/{Layout.tsx,App.tsx}`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-008..011 and the list half of REQ-UI-014 has a vitest test; the Projects page tests still pass after it switches to the shared hook; no new dependency.
- **Estimated complexity**: medium

Interfaces consumed: `GET /api/sessions` from Track 1. Produced: `navigate(to)`, `useLocation()`, `Link`, `useVisibleInterval(callback, ms)`, `SessionSummary`, `fetchSessions(project?)`, `CopyResumeButton`, `SessionsPage`.

- [ ] **Step 1: failing tests.** `frontend/src/features/sessions/SessionsPage.test.tsx` (same style as `ProjectsPage.test.tsx`: `cleanup()` and `vi.restoreAllMocks()` in `afterEach`, a fresh `Response` per call):

```tsx
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSummary } from "./api";
import { SessionsPage } from "./SessionsPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const session = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: "11111111-1111-4111-8111-111111111111",
  project: "qwikfone",
  title: "Fix the bug",
  cwd: "/home/gin/qwikfone",
  modified: "2026-10-14T08:00:00Z",
  size: 2048,
  live: false,
  name: null,
  status: null,
  kind: null,
  resume_command: "cd /home/gin/qwikfone && claude --resume 11111111-1111-4111-8111-111111111111",
  ...overrides,
});

const stub = (...bodies: Response[]) => {
  const fetchMock = vi.fn();
  bodies.forEach((body) => fetchMock.mockResolvedValueOnce(body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const stubAlways = (make: () => Response) => {
  const fetchMock = vi.fn(() => Promise.resolve(make()));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

beforeEach(() => window.history.replaceState(null, "", "/sessions"));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
```

```tsx
const ID2 = "22222222-2222-4222-8222-222222222222";
const rowOf = (title: string) => {
  const row = screen.getByText(title).closest("tr");
  if (row === null) throw new Error(`no row for ${title}`);
  return row;
};
const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("SessionsPage", () => {
  // REQ-UI-009
  it("REQ-UI-009 shows title, project, cwd and the live badge", async () => {
    stubAlways(() =>
      json([
        session({ live: true, status: "busy", kind: "bg" }),
        session({ id: ID2, title: "Old one" }),
      ]),
    );
    render(<SessionsPage />);
    await screen.findByText("Fix the bug");
    expect(within(rowOf("Fix the bug")).getByText("live")).toBeInTheDocument();
    expect(within(rowOf("Fix the bug")).getByText(/busy/)).toBeInTheDocument();
    expect(within(rowOf("Old one")).queryByText("live")).not.toBeInTheDocument();
    expect(within(rowOf("Old one")).getByText("qwikfone")).toBeInTheDocument();
    expect(within(rowOf("Old one")).getByText("/home/gin/qwikfone")).toBeInTheDocument();
  });

  // REQ-UI-009
  it("REQ-UI-009 says when there are no sessions", async () => {
    stubAlways(() => json([]));
    render(<SessionsPage />);
    expect(await screen.findByText(/no sessions found/i)).toBeInTheDocument();
  });

  // REQ-UI-009
  it("REQ-UI-009 filters by project and keeps it in the URL", async () => {
    stubAlways(() =>
      json([session(), session({ id: ID2, title: "Console work", project: "gin-console" })]),
    );
    render(<SessionsPage />);
    await screen.findByText("Fix the bug");
    await userEvent.selectOptions(screen.getByLabelText("Project"), "gin-console");
    expect(screen.queryByText("Fix the bug")).not.toBeInTheDocument();
    expect(screen.getByText("Console work")).toBeInTheDocument();
    expect(window.location.search).toBe("?project=gin-console");
  });

  // REQ-UI-009
  it("REQ-UI-009 reads the filter from the URL", async () => {
    window.history.replaceState(null, "", "/sessions?project=gin-console");
    stubAlways(() =>
      json([session(), session({ id: ID2, title: "Console work", project: "gin-console" })]),
    );
    render(<SessionsPage />);
    await screen.findByText("Console work");
    expect(screen.queryByText("Fix the bug")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Project")).toHaveValue("gin-console");
  });

  // REQ-UI-010
  it("REQ-UI-010 refreshes every 10 seconds without a loading state", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json([session()])))
      .mockImplementation(() => Promise.resolve(json([session({ title: "Renamed" })])));
    vi.stubGlobal("fetch", fetchMock);
    render(<SessionsPage />);
    await settle(0);
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    await settle(10_000);
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // REQ-UI-010
  it("REQ-UI-010 keeps the list when a refresh fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json([session()])))
      .mockImplementation(() => Promise.resolve(json({}, 500)));
    vi.stubGlobal("fetch", fetchMock);
    render(<SessionsPage />);
    await settle(0);
    await settle(10_000);
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/500/);
  });

  // REQ-UI-014
  it("REQ-UI-014 shows a list error and retries", async () => {
    stub(json({}, 500), json([session()]));
    render(<SessionsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("Fix the bug")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-011
  it("REQ-UI-011 copies the resume command", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    stubAlways(() => json([session()]));
    render(<SessionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy resume" }));
    expect(writeText).toHaveBeenCalledWith(session().resume_command);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  // REQ-UI-011
  it("REQ-UI-011 shows the command when the clipboard refuses", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    stubAlways(() => json([session()]));
    render(<SessionsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy resume" }));
    expect(await screen.findByRole("textbox")).toHaveValue(session().resume_command);
  });
});
```

`frontend/src/app/App.test.tsx`:

```tsx
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App routing", () => {
  // REQ-UI-008
  it("REQ-UI-008 opens the list from the sidebar without a reload and follows back", async () => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await screen.findByText(/no projects configured/i);
    await userEvent.click(screen.getByRole("link", { name: "Sessions" }));
    expect(window.location.pathname).toBe("/sessions");
    await screen.findByText(/no sessions found/i);
    act(() => window.history.back());
    await screen.findByText(/no projects configured/i);
    expect(window.location.pathname).toBe("/");
  });
});
```

Run `pnpm -C frontend test --run`; expect failures (modules missing).

- [ ] **Step 2: shared hook** `frontend/src/lib/useVisibleInterval.ts`:

```ts
import { useEffect } from "react";

/** Run `callback` now and every `ms` while the page is visible; run it again when it becomes visible. */
export function useVisibleInterval(callback: () => void, ms: number): void {
  useEffect(() => {
    callback();
    const tick = () => {
      if (document.visibilityState === "visible") callback();
    };
    const timer = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [callback, ms]);
}
```

In `ProjectsPage.tsx` replace its whole polling `useEffect` (the block that calls `load()`, defines `refresh`, `setInterval` and the listener) with `useVisibleInterval(load, REFRESH_MS);`, import the hook from `@/lib/useVisibleInterval`, and drop the now unused `useEffect` import. The existing `ProjectsPage` tests are the regression guard.

- [ ] **Step 3: routing.** `frontend/src/app/route.ts`:

```ts
import { useEffect, useState } from "react";

type Location = { pathname: string; search: string };

const current = (): Location => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

export function navigate(to: string): void {
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useLocation(): Location {
  const [location, setLocation] = useState(current);
  useEffect(() => {
    const update = () => setLocation(current());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return location;
}
```

`frontend/src/app/Link.tsx`:

```tsx
import type { MouseEvent, ReactNode } from "react";
import { navigate } from "./route";

export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
```

`Layout.tsx`: replace the single `<a href="/">` with two `Link`s inside the `nav`; Projects is active when `pathname === "/"`, Sessions when `pathname.startsWith("/sessions")`; the active one gets `bg-muted font-medium` (use `cn` from `@/lib/utils`), both get `rounded px-2 py-1`. `useLocation()` supplies `pathname`.

`App.tsx`:

```tsx
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { SessionsPage } from "@/features/sessions/SessionsPage";
import { Layout } from "./Layout";
import { useLocation } from "./route";

export function App() {
  const { pathname } = useLocation();
  return <Layout>{pathname === "/sessions" ? <SessionsPage /> : <ProjectsPage />}</Layout>;
}
```

- [ ] **Step 4: API module** `frontend/src/features/sessions/api.ts`:

```ts
export type SessionSummary = {
  id: string;
  project: string;
  title: string;
  cwd: string | null;
  modified: string;
  size: number;
  live: boolean;
  name: string | null;
  status: string | null;
  kind: string | null;
  resume_command: string;
};

// Reflect.get keeps the guards free of type assertions; the result is checked before use.
const field = (value: object, key: string): unknown => Reflect.get(value, key);
const isString = (value: unknown) => typeof value === "string";
const isStringOrNull = (value: unknown) => value === null || typeof value === "string";

function isSession(value: unknown): value is SessionSummary {
  if (typeof value !== "object" || value === null) return false;
  return (
    ["id", "project", "title", "modified", "resume_command"].every((k) => isString(field(value, k))) &&
    ["cwd", "name", "status", "kind"].every((k) => isStringOrNull(field(value, k))) &&
    typeof field(value, "size") === "number" &&
    typeof field(value, "live") === "boolean"
  );
}

export async function fetchSessions(project?: string): Promise<SessionSummary[]> {
  const query = project === undefined ? "" : `?project=${encodeURIComponent(project)}`;
  const response = await fetch(`/api/sessions${query}`);
  if (!response.ok) {
    throw new Error(`Could not load sessions (HTTP ${response.status})`);
  }
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isSession)) {
    throw new Error("Could not load sessions (unexpected response)");
  }
  return body;
}
```

- [ ] **Step 5: copy button** `CopyResumeButton.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";

type State = "idle" | "copied" | "refused";

export function CopyResumeButton({ command }: { command: string }) {
  const [state, setState] = useState<State>("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setState("copied");
    } catch {
      setState("refused"); // no clipboard (insecure context) or permission denied: show the command
    }
  };
  return (
    <span className="flex flex-col items-start gap-1">
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        Copy resume
      </Button>
      {state === "copied" && <span className="text-sm text-muted-foreground">Copied</span>}
      {state === "refused" && (
        <input
          readOnly
          aria-label="Resume command"
          value={command}
          onFocus={(event) => event.currentTarget.select()}
          className="w-72 rounded border px-2 py-1 font-mono text-xs"
        />
      )}
    </span>
  );
}
```

- [ ] **Step 6: page** `SessionsPage.tsx`: same state union and failure handling as `ProjectsPage` (`loading` | `error` | `ok { sessions, error }`, `useCallback` loader calling `fetchSessions()` with no filter, `useVisibleInterval(load, 10_000)`, one `Alert` with Retry for `error` or a stale `ok.error`, empty state "No sessions found."). Filtering is client-side so the project options never disappear:

```tsx
const { search } = useLocation();
const filter = new URLSearchParams(search).get("project") ?? "";
const projects = [...new Set([...sessions.map((s) => s.project), ...(filter ? [filter] : [])])].sort();
const shown = filter ? sessions.filter((s) => s.project === filter) : sessions;
const choose = (value: string) =>
  navigate(value ? `/sessions?project=${encodeURIComponent(value)}` : "/sessions");
```

Render:

```tsx
return (
  <section className="flex flex-col gap-4">
    <h1 className="text-xl font-semibold">Sessions</h1>
    {state.status === "loading" && <p className="text-muted-foreground">Loading sessions…</p>}
    {errorMessage !== null && (
      <Alert variant="destructive">
        <AlertTitle>Sessions could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <span>{errorMessage}</span>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )}
    {state.status === "ok" && (
      <label className="flex items-center gap-2 text-sm">
        Project
        <select
          value={filter}
          onChange={(event) => choose(event.target.value)}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="">All projects</option>
          {projects.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    )}
    {state.status === "ok" && shown.length === 0 && (
      <p className="text-muted-foreground">No sessions found.</p>
    )}
    {state.status === "ok" && shown.length > 0 && (
      <Table>
        <TableHeader>
          <TableRow>
            {["Title", "Project", "Cwd", "Modified", "Size", "Status", "Resume"].map((name) => (
              <TableHead key={name}>{name}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <Link to={`/sessions/${encodeURIComponent(s.project)}/${s.id}`}>{s.title}</Link>
              </TableCell>
              <TableCell>{s.project}</TableCell>
              <TableCell className="font-mono text-sm">{s.cwd}</TableCell>
              <TableCell>{new Date(s.modified).toLocaleString()}</TableCell>
              <TableCell>{`${Math.max(1, Math.round(s.size / 1024))} KB`}</TableCell>
              <TableCell>
                {s.live && (
                  <span className="flex items-center gap-1">
                    <Badge>live</Badge>
                    {[s.status, s.kind].filter(Boolean).join(" · ")}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <CopyResumeButton command={s.resume_command} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </section>
);
```

with, above the `return`, `const sessions = state.status === "ok" ? state.sessions : [];`, the `filter`/`projects`/`shown`/`choose` lines above, `errorMessage` computed as in `ProjectsPage`, and `retry` as in `ProjectsPage` (`if (state.status === "error") setState({ status: "loading" }); load();`). Imports: `useCallback, useState` from react, `Alert*`, `Badge`, `Button`, `Table*` from `@/components/ui`, `Link`, `navigate`, `useLocation` from `@/app/...`, `useVisibleInterval`, `fetchSessions`, `CopyResumeButton`.

- [ ] **Step 7:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build`; expect all green.

### Track 4: Session log page
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-UI-012, REQ-UI-013, REQ-UI-014
- **Files**: create `frontend/src/features/sessions/{BlockView.tsx,MessageView.tsx,SessionLogPage.tsx,SessionLogPage.test.tsx}`; modify `frontend/src/features/sessions/api.ts`, `frontend/src/app/App.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-012, REQ-UI-013 and the log half of REQ-UI-014 has a vitest test; transcript text never becomes an element; a malformed route segment does not crash the app.
- **Estimated complexity**: medium

Interfaces consumed: `GET /api/sessions/{project}/{id}/messages` (Track 2), `fetchSessions`, `CopyResumeButton`, `Link` (Track 3). Produced: `Block`, `Message`, `MessagePage`, `SessionNotFoundError`, `fetchMessages(project, id, offset)`, `SessionLogPage`.

- [ ] **Step 1: failing tests** `SessionLogPage.test.tsx`. Same setup as `SessionsPage.test.tsx` (fresh `Response` per call). The fetch stub dispatches on the URL:

```tsx
const ID = "11111111-1111-4111-8111-111111111111";
const page = (items: unknown[], next: number | null) => ({ items, next_offset: next });
const text = (role: "user" | "assistant", value: string, truncated = false) => ({
  role,
  blocks: [{ type: "text", text: value, name: null, input: null, truncated }],
});

function stubApi(routes: { messages: (offset: number) => Response; list?: () => Response }) {
  const fetchMock = vi.fn((url: string) => {
    const messages = /\/messages\?offset=(\d+)/.exec(url);
    if (messages) return Promise.resolve(routes.messages(Number(messages[1])));
    return Promise.resolve(routes.list ? routes.list() : json([session()]));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
```

(`json` and `session` as in `SessionsPage.test.tsx`; render with `<SessionLogPage project="qwikfone" id={ID} />`.)

```tsx
const block = (type: string, overrides: Record<string, unknown> = {}) => ({
  type, text: null, name: null, input: null, truncated: false, ...overrides,
});
const rich = {
  role: "assistant",
  blocks: [
    block("text", { text: "hello there" }),
    block("thinking", { text: "pondering" }),
    block("tool_use", { name: "Bash", input: '{"command":"ls"}' }),
    block("tool_result", { text: "file.txt", truncated: true }),
  ],
};
const open = (label: RegExp) => screen.getByText(label).closest("details");

describe("SessionLogPage", () => {
  // REQ-UI-012
  it("REQ-UI-012 shows the header and the messages in order", async () => {
    stubApi({ messages: () => json(page([text("user", "first"), text("assistant", "second")], null)) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await screen.findByText("first");
    expect(await screen.findByText("Fix the bug")).toBeInTheDocument();
    expect(screen.getByText("/home/gin/qwikfone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy resume" })).toBeInTheDocument();
    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("user")).toBeInTheDocument();
    expect(within(articles[1]).getByText("assistant")).toBeInTheDocument();
  });

  // REQ-UI-012
  it("REQ-UI-012 collapses thinking, tool calls and results", async () => {
    stubApi({ messages: () => json(page([rich], null)) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByText("hello there")).toBeVisible();
    expect(open(/tool_use: Bash/)).toHaveProperty("open", false);
    expect(open(/^thinking$/)).toHaveProperty("open", false);
    expect(open(/^tool_result$/)).toHaveProperty("open", false);
    expect(screen.getByText("truncated")).toBeInTheDocument();
  });

  // REQ-UI-012
  it("REQ-UI-012 never interprets transcript text", async () => {
    const hostile = "<script>window.hacked = 1</script> **bold**";
    stubApi({ messages: () => json(page([text("user", hostile)], null)) });
    const { container } = render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByText(hostile)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });

  // REQ-UI-013
  it("REQ-UI-013 loads more until there is no next offset", async () => {
    const fetchMock = stubApi({
      messages: (offset) =>
        json(offset === 0 ? page([text("user", "one")], 3) : page([text("user", "two")], null)),
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("two")).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("offset=3"));
  });

  // REQ-UI-013
  it("REQ-UI-013 refreshes a live session without duplicating messages", async () => {
    let calls = 0;
    stubApi({
      list: () => json([session({ live: true })]),
      messages: () => {
        calls += 1;
        return json(
          page(calls === 1 ? [text("user", "one")] : [text("user", "one"), text("user", "two")], null),
        );
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await screen.findByText("one");
    await userEvent.click(await screen.findByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("two")).toBeInTheDocument();
    expect(screen.getAllByText("one")).toHaveLength(1);
  });

  // REQ-UI-013
  it("REQ-UI-013 offers no refresh for an ended session", async () => {
    stubApi({ messages: () => json(page([text("user", "one")], null)) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await screen.findByText("one");
    await screen.findByText("Fix the bug");
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
  });

  // REQ-UI-014
  it("REQ-UI-014 says when the session is not found", async () => {
    stubApi({ messages: () => new Response("", { status: 404 }) });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByText("Session not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to sessions" })).toHaveAttribute("href", "/sessions");
  });

  // REQ-UI-014
  it("REQ-UI-014 shows a load error and retries", async () => {
    let calls = 0;
    stubApi({
      messages: () => {
        calls += 1;
        return calls === 1 ? json({}, 500) : json(page([text("user", "back")], null));
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("back")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-014
  it("REQ-UI-014 keeps the loaded messages when load more fails and retries it", async () => {
    let second = 0;
    stubApi({
      messages: (offset) => {
        if (offset === 0) return json(page([text("user", "one")], 3));
        second += 1;
        return second === 1 ? json({}, 500) : json(page([text("user", "two")], null));
      },
    });
    render(<SessionLogPage project="qwikfone" id={ID} />);
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    expect(screen.getByText("one")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByText("two")).toBeInTheDocument();
  });
});
```

The `<script>` text is a child of a `<p>`, so React escapes it; the test fails if any later change renders transcript text as HTML.

Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: API additions** in `api.ts`:

```ts
export type Block = {
  type: "text" | "thinking" | "tool_use" | "tool_result";
  text: string | null;
  name: string | null;
  input: string | null;
  truncated: boolean;
};
export type Message = { role: "user" | "assistant"; blocks: Block[] };
export type MessagePage = { items: Message[]; next_offset: number | null };

export class SessionNotFoundError extends Error {}

const BLOCK_TYPES = ["text", "thinking", "tool_use", "tool_result"];

function isBlock(value: unknown): value is Block {
  if (typeof value !== "object" || value === null) return false;
  return (
    BLOCK_TYPES.includes(String(field(value, "type"))) &&
    ["text", "name", "input"].every((k) => isStringOrNull(field(value, k))) &&
    typeof field(value, "truncated") === "boolean"
  );
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) return false;
  const blocks = field(value, "blocks");
  return (
    ["user", "assistant"].includes(String(field(value, "role"))) &&
    Array.isArray(blocks) &&
    blocks.every(isBlock)
  );
}

export async function fetchMessages(project: string, id: string, offset: number): Promise<MessagePage> {
  const response = await fetch(
    `/api/sessions/${encodeURIComponent(project)}/${encodeURIComponent(id)}/messages?offset=${offset}`,
  );
  if (response.status === 404) throw new SessionNotFoundError("Session not found");
  if (!response.ok) throw new Error(`Could not load messages (HTTP ${response.status})`);
  const body: unknown = await response.json();
  const items = typeof body === "object" && body !== null ? field(body, "items") : undefined;
  const next = typeof body === "object" && body !== null ? field(body, "next_offset") : undefined;
  if (!Array.isArray(items) || !items.every(isMessage) || !(next === null || typeof next === "number")) {
    throw new Error("Could not load messages (unexpected response)");
  }
  return { items, next_offset: next };
}
```

- [ ] **Step 3: views.** `BlockView.tsx`:

```tsx
import type { Block } from "./api";

export function BlockView({ block }: { block: Block }) {
  const note = block.truncated && <p className="text-sm text-muted-foreground">truncated</p>;
  if (block.type === "text") {
    return (
      <>
        <p className="whitespace-pre-wrap break-words">{block.text}</p>
        {note}
      </>
    );
  }
  const label = block.type === "tool_use" ? `tool_use: ${block.name ?? "?"}` : block.type;
  return (
    <details className="rounded border px-2 py-1 text-sm">
      <summary className="cursor-pointer">{label}</summary>
      <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-words">
        {block.input ?? block.text ?? ""}
      </pre>
      {note}
    </details>
  );
}
```

`MessageView.tsx`:

```tsx
import { BlockView } from "./BlockView";
import type { Message } from "./api";

export function MessageView({ message }: { message: Message }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-xs font-medium uppercase text-muted-foreground">{message.role}</span>
      {message.blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </article>
  );
}
```

(Blocks of an immutable message never reorder, so the index is a stable key; the role label is text, not colour only.)

- [ ] **Step 4: page** `SessionLogPage.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/app/Link";
import { CopyResumeButton } from "./CopyResumeButton";
import { MessageView } from "./MessageView";
import {
  fetchMessages, fetchSessions, SessionNotFoundError, type Message, type SessionSummary,
} from "./api";

type Page = { offset: number; items: Message[] };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "notfound" }
  | { status: "ok"; pages: Page[]; next: number | null; error: string | null };
type Mode = "replace" | "append" | "replace-last";

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function SessionLogPage({ project, id }: { project: string; id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const lastAction = useRef<() => void>(() => undefined);

  const request = useCallback(
    (offset: number, mode: Mode) => {
      lastAction.current = () => request(offset, mode);
      void fetchMessages(project, id, offset).then(
        (result) =>
          setState((previous) => {
            const page: Page = { offset, items: result.items };
            const pages =
              mode === "replace" || previous.status !== "ok"
                ? [page]
                : mode === "append"
                  ? [...previous.pages, page]
                  : [...previous.pages.slice(0, -1), page];
            return { status: "ok", pages, next: result.next_offset, error: null };
          }),
        (error: unknown) =>
          setState((previous) =>
            error instanceof SessionNotFoundError
              ? { status: "notfound" }
              : previous.status === "ok"
                ? { ...previous, error: messageOf(error) }
                : { status: "error", message: messageOf(error) },
          ),
      );
    },
    [project, id],
  );

  useEffect(() => {
    request(0, "replace");
  }, [request]);

  useEffect(() => {
    fetchSessions(project).then(
      (sessions) => setSummary(sessions.find((s) => s.id === id) ?? null),
      () => setSummary(null), // the header is optional: the log is readable without it
    );
  }, [project, id]);

  const retry = () => {
    if (state.status === "error") setState({ status: "loading" });
    lastAction.current();
  };
  const errorMessage =
    state.status === "error" ? state.message : state.status === "ok" ? state.error : null;
  const last = state.status === "ok" ? state.pages[state.pages.length - 1] : undefined;
  const messages = state.status === "ok" ? state.pages.flatMap((p) => p.items) : [];

  return (
    <section className="flex flex-col gap-4">
      <Link to="/sessions" className="text-sm underline underline-offset-2">
        Back to sessions
      </Link>
      {state.status === "notfound" ? (
        <p>Session not found</p>
      ) : (
        <>
          <header className="flex flex-col items-start gap-1">
            <h1 className="text-xl font-semibold">{summary?.title ?? id}</h1>
            {summary?.cwd && <span className="font-mono text-sm">{summary.cwd}</span>}
            {summary && <CopyResumeButton command={summary.resume_command} />}
          </header>
          {state.status === "loading" && <p className="text-muted-foreground">Loading messages…</p>}
          {errorMessage !== null && (
            <Alert variant="destructive">
              <AlertTitle>Messages could not be loaded</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span>{errorMessage}</span>
                <Button variant="outline" size="sm" onClick={retry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {state.status === "ok" && (
            <div className="flex flex-col gap-3">
              {state.pages.flatMap((p) =>
                p.items.map((message, index) => (
                  <MessageView key={`${p.offset}-${index}`} message={message} />
                )),
              )}
              {messages.length === 0 && <p className="text-muted-foreground">No messages.</p>}
              <div className="flex gap-2">
                {state.next !== null && (
                  <Button variant="outline" onClick={() => request(state.next ?? 0, "append")}>
                    Load more
                  </Button>
                )}
                {summary?.live && last && (
                  <Button variant="outline" onClick={() => request(last.offset, "replace-last")}>
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
```

A refresh re-reads the last page from its own start offset, so records written since then appear and nothing is duplicated.

`App.tsx` adds the route (a segment that cannot be decoded falls through to the Projects page instead of throwing):

```tsx
function logRoute(pathname: string): { project: string; id: string } | null {
  const match = /^\/sessions\/([^/]+)\/([^/]+)$/.exec(pathname);
  if (!match) return null;
  try {
    return { project: decodeURIComponent(match[1]), id: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}
```

and renders `<SessionLogPage key={`${log.project}/${log.id}`} project={log.project} id={log.id} />` when `logRoute(pathname)` is not null (the key resets the page state when the route changes), before the `/sessions` and fallback cases. Add one assertion to `App.test.tsx`: `/sessions/qwikfone/<id>` renders the log page and `/sessions/%E0%A4%A` renders the Projects page.

- [ ] **Step 5:** run `pnpm -C frontend test --run && pnpm -C frontend lint && pnpm -C frontend typecheck && pnpm -C frontend build && uv --directory backend run pytest -q`; expect all green.

## Integration
- **Branch**: `feat/gin-console-rm-claude-sessions` (one worktree for the epic)
- **Merge strategy**: sequential

## Validation
- [ ] `uv --directory backend run pytest`, `ruff check .`, `mypy` clean
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` clean
- [ ] Every REQ-ID of the delta appears in at least one test (`gin-workflow specs trace --change gin-console-rm-claude-sessions`)
- [ ] Manual (live host, after `pnpm -C frontend build && systemctl --user restart gin-console`): `curl -s 127.0.0.1:8700/api/sessions?project=gin-console` lists this project's sessions with the current one `live: true`; the Sessions page at `:8443` shows them, the filter works, "Copy resume" puts a working command on the clipboard, and a log opens with tool calls collapsed and "Load more" working on a long transcript

## Notes
- Model guidance is planning metadata, not Beads state.
- Live detection reads `/proc/<pid>`. Inside the Docker image the host's pids are not visible, so no session shows as live there unless the container runs with `pid: host`; the systemd service is unaffected. This is a known limit, not a task.
- `read_messages` re-reads the file from line 0 for every page, and the list reads two 64 KiB chunks per file on every poll. Both are fine at today's sizes (Track 1 step 7 measures the list); add an offset index or an mtime-keyed summary cache only when a measurement says so.
- After `limit` items the next line becomes `next_offset` even when only non-message lines remain, so a transcript with exactly a multiple of 100 messages can show one empty final "Load more" page. Accepted.
- The Sessions page filters on the client from the full list so the project options never disappear; `GET /api/sessions?project=` is used by the log page header.
