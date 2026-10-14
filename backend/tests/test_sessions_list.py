import os
from pathlib import Path

import pytest
from claude_home import DEAD_PID, A, B, C, make_home, write_live, write_transcript
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
    filler: dict[str, object] = {"type": "attachment", "pad": "x" * 1000}
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
