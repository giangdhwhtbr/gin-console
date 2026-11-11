import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_export import FakeExport, bead, comment, dep, related, write_export
from fakes import Fake
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError, read_export
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any = None) -> TestClient:
    """An app over project `proj` whose rows come from `fake`; `proj` has an export file so the
    snapshot is kept until that file changes. Without `fake`, the real reader reads that file."""
    (tmp_path / "proj").mkdir(exist_ok=True)
    (tmp_path / "dist").mkdir(exist_ok=True)
    if fake is not None:
        write_export(tmp_path / "proj", [])
    settings = Settings(
        projects=[
            ProjectEntry(name="proj", path=tmp_path / "proj"),
            ProjectEntry(name="gone", path=tmp_path / "gone"),
        ]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        claude_home=tmp_path,
        read_beads=read_export if fake is None else fake,
        clock=Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def touch_export(tmp_path: Path, at: int) -> None:
    """Give proj's export file a new modification time, as a bd write does."""
    os.utime(tmp_path / "proj" / ".beads" / "issues.jsonl", ns=(at, at))


FOUR = [bead("a-1"), bead("a-2", status="in_progress"), bead("a-3"), bead("a-4", status="open")]
CLOSED = [bead(f"c-{n}", status="closed") for n in range(4)]


# REQ-BEADS-001
def test_beads_001_open_beads_by_default_and_all_on_request(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(FOUR + CLOSED))
    body = api.get("/api/beads", params={"project": "proj"}).json()
    assert len(body) == 4 and all(b["status"] != "closed" for b in body)
    assert {"id", "title", "status", "priority", "issue_type", "labels", "updated_at"} <= set(
        body[0]
    )
    assert "description" not in body[0]
    assert len(api.get("/api/beads", params={"project": "proj", "closed": "1"}).json()) == 8


# REQ-BEADS-001
@pytest.mark.parametrize("params", [{"project": "nope"}, {"project": "gone"}, {}])
def test_beads_001_unknown_project_or_missing_directory_is_404(
    tmp_path: Path, params: dict[str, str]
) -> None:
    fake = FakeExport(FOUR)
    assert make(tmp_path, fake).get("/api/beads", params=params).status_code == 404
    assert fake.calls == []


# REQ-BEADS-002
def test_beads_002_detail_over_http(tmp_path: Path) -> None:
    shown = bead("a-5", description="Why", dependencies=[dep("a-5", "a-4", "blocks")])
    up = {"a-5": [related("a-6", "blocks"), related("a-7", "parent-child", status="closed")]}
    fake = FakeExport([bead("a-4")], shown={"a-5": shown}, up=up)
    body = make(tmp_path, fake).get("/api/beads/proj/a-5").json()
    assert body["description"] == "Why"
    assert [d["id"] for d in body["dependencies"]] == ["a-4"]
    assert [d["id"] for d in body["dependents"]] == ["a-6"]
    assert [(c["id"], c["status"]) for c in body["children"]] == [("a-7", "closed")]
    assert body["children"][0]["type"] == "parent-child"


# REQ-BEADS-002
@pytest.mark.parametrize(
    "path", ["/api/beads/proj/x-1", "/api/beads/nope/a-5", "/api/beads/gone/a-5"]
)
def test_beads_002_unknown_bead_project_or_directory_is_404(tmp_path: Path, path: str) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(path).status_code == 404


# REQ-BEADS-003 (Option-like id: 404, and no file outside issues.jsonl is read)
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_beads_003_option_like_ids_are_404_and_read_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}").status_code == 404
    assert fake.calls == []


# REQ-BEADS-003 (Odd closed value)
@pytest.mark.parametrize("closed", ["../x", "true", "", "0", "11", "1&closed=0"])
def test_beads_003_odd_closed_values_mean_not_closed(tmp_path: Path, closed: str) -> None:
    api = make(tmp_path, FakeExport(FOUR + CLOSED))
    response = api.get("/api/beads", params={"project": "proj", "closed": closed})
    assert response.status_code == 200 and len(response.json()) == 4


# REQ-BEADS-003 (No bd process)
def test_beads_003_no_bd_process(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    gin = Fake()  # `gin state` for /api/projects
    started: list[list[str]] = []

    def run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        started.append(cmd)
        if Path(cmd[0]).stem == "bd":
            raise AssertionError(f"bd started: {cmd}")
        return gin(cmd, **kwargs)

    def popen(cmd: list[str], *args: Any, **kwargs: Any) -> None:
        raise AssertionError(f"process started: {cmd}")

    monkeypatch.setattr(subprocess, "run", run)
    monkeypatch.setattr(subprocess, "Popen", popen)
    write_export(tmp_path / "proj", [*FOUR, bead("a-5", comments=[comment("a-5")])])
    api = make(tmp_path)  # the default reader
    for path in (
        "/api/beads?project=proj",
        "/api/beads/proj/a-5",
        "/api/beads/proj/a-5/comments",
        "/api/projects",
        "/api/reports?project=proj",
    ):
        assert api.get(path).status_code == 200, path
    assert started and all(Path(cmd[0]).stem != "bd" for cmd in started)  # gin state only
    project = next(p for p in api.get("/api/projects").json() if p["name"] == "proj")
    assert project["beads"]["open"] == 4


# REQ-BEADS-011 (removed): the reopens route is gone
def test_beads_011_removed_reopens_404(tmp_path: Path) -> None:
    fake = FakeExport(shown={"a-1": bead("a-1")})
    assert make(tmp_path, fake).get("/api/beads/proj/a-1/reopens").status_code == 404


# REQ-BEADS-004 (Every view from one read)
def test_beads_004_one_read_serves_every_view(tmp_path: Path) -> None:
    fake = FakeExport(FOUR + CLOSED, shown={"a-1": bead("a-1")})
    api = make(tmp_path, fake)
    api.get("/api/beads", params={"project": "proj"})
    api.get("/api/beads", params={"project": "proj", "closed": "1"})
    api.get("/api/beads/proj/a-1")
    api.get("/api/beads/proj/a-1/comments")
    assert fake.calls == [tmp_path / "proj"]


# REQ-BEADS-012 (Unchanged file, Changed file)
def test_beads_012_a_changed_file_is_read_again(tmp_path: Path) -> None:
    fake = FakeExport(FOUR)
    api = make(tmp_path, fake)
    touch_export(tmp_path, 1_000_000_000)
    api.get("/api/beads", params={"project": "proj"})
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 1
    touch_export(tmp_path, 2_000_000_000)
    fake.beads = [*FOUR, bead("a-9")]
    body = api.get("/api/beads", params={"project": "proj"}).json()
    assert len(fake.calls) == 2 and "a-9" in {b["id"] for b in body}


# REQ-BEADS-012 (Refresh)
def test_beads_012_refresh_reads_again(tmp_path: Path) -> None:
    fake = FakeExport(FOUR)
    api = make(tmp_path, fake)
    api.get("/api/beads", params={"project": "proj"})
    response = api.post("/api/refresh")
    assert response.status_code == 204 and response.content == b""
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 2


# REQ-BEADS-004 (Errors are not kept)
def test_beads_004_errors_are_not_kept(tmp_path: Path) -> None:
    fake = FakeExport(FOUR, failure=BeadsError(".beads/issues.jsonl could not be read: x"))
    api = make(tmp_path, fake)
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 502
    fake.failure = None
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200


# REQ-BEADS-005
@pytest.mark.parametrize(
    "message",
    [
        ".beads/issues.jsonl could not be read: Permission denied",
        ".beads/issues.jsonl has a line that is not JSON",
    ],
)
def test_beads_005_failures_are_502_with_an_error(tmp_path: Path, message: str) -> None:
    api = make(tmp_path, FakeExport(failure=BeadsError(message)))
    for path in ("/api/beads?project=proj", "/api/beads/proj/a-5"):
        response = api.get(path)
        assert response.status_code == 502 and response.json() == {"error": message}


# REQ-BEADS-005 (One malformed bead)
def test_beads_005_one_malformed_bead_does_not_fail_the_list(tmp_path: Path) -> None:
    fake = FakeExport([bead("a-1"), bead("a-2", title=7), bead("a-3")])
    body = make(tmp_path, fake).get("/api/beads", params={"project": "proj"}).json()
    assert [b["id"] for b in body] == ["a-1", "a-3"]


# REQ-BEADS-005
def test_beads_005_a_too_deeply_nested_file_is_a_502_not_a_500(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(failure=RecursionError()))
    response = api.get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502 and "error" in response.json()


# REQ-BEADS-006
def test_beads_006_lone_surrogates_do_not_break_responses(tmp_path: Path) -> None:
    shown = bead("a-5", title="a\ud800b", description="x\ud800")
    api = make(tmp_path, FakeExport([shown], {"a-5": shown}))
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200
    detail = api.get("/api/beads/proj/a-5")
    assert detail.status_code == 200 and detail.json()["title"] == "a?b"


# REQ-BEADS-007
def test_beads_007_flags_over_http(tmp_path: Path) -> None:
    first, second = "a-1", "a-3"
    beads = [bead("a-1"), bead("a-2", status="in_progress")]
    beads.append(bead("a-3", dependencies=[dep("a-3", "a-2", "blocks")]))
    api = make(tmp_path, FakeExport(beads))
    rows = {r["id"]: r for r in api.get("/api/beads", params={"project": "proj"}).json()}
    assert rows[first]["ready"] is True and rows[first]["blocked"] is False
    assert rows[second]["blocked"] is True and rows[second]["ready"] is False
    assert rows[first]["closed_at"] is None


# REQ-BEADS-007
# REQ-MILESTONE-UI-007
def test_beads_007_milestone_is_never_ready_over_http(tmp_path: Path) -> None:
    fake = FakeExport([bead("m-1", issue_type="milestone"), bead("r-1")])
    body = make(tmp_path, fake).get("/api/beads", params={"project": "proj"}).json()
    assert {b["id"]: b["ready"] for b in body} == {"m-1": False, "r-1": True}


# REQ-MILESTONE-UI-007
# TC: TC-MILESTONE-UI-021@70bd69aa
def test_tc_milestone_ui_021_open_milestone_without_blockers_is_not_ready_work(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(subprocess, "run", Fake())  # gin state
    api = make(tmp_path, FakeExport([bead("m1", issue_type="milestone"), bead("t1")]))
    project = next(p for p in api.get("/api/projects").json() if p["name"] == "proj")
    assert project["beads"]["ready"] == 1
    rows = api.get("/api/beads", params={"project": "proj"}).json()
    assert {b["id"]: b["ready"] for b in rows} == {"m1": False, "t1": True}


# REQ-BEADS-005 (Missing file)
def test_beads_005_missing_file_502(tmp_path: Path) -> None:
    api = make(tmp_path)  # the default reader; proj has no .beads/issues.jsonl
    for path in ("/api/beads?project=proj", "/api/beads/proj/a-1", "/api/beads/proj/a-1/comments"):
        response = api.get(path)
        assert response.status_code == 502
        error = response.json()["error"]
        assert ".beads/issues.jsonl" in error and "bd config set export.auto true" in error


# REQ-BEADS-005 (Malformed line)
def test_beads_005_malformed_line_502(tmp_path: Path) -> None:
    path = write_export(tmp_path / "proj", [bead("a-1")])
    path.write_text(path.read_text() + "[1, 2]\n")
    response = make(tmp_path).get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502
    assert "a line that is not a JSON object" in response.json()["error"]


# REQ-BEADS-005
@pytest.mark.parametrize("path", ["/api/beads?project=proj", "/api/beads/proj/a-1/comments"])
def test_beads_005_unexpected_export_shape_is_502(tmp_path: Path, path: str) -> None:
    api = make(tmp_path, FakeExport(FOUR, output={"x": 1}))
    assert api.get(path).status_code == 502


# REQ-BEADS-008
def test_beads_008_comments_over_http(tmp_path: Path) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")}, comments={"a-5": [comment("a-5", "hi")]})
    body = make(tmp_path, fake).get("/api/beads/proj/a-5/comments").json()
    assert [(c["author"], c["text"], c["truncated"]) for c in body] == [("me", "hi", False)]
    assert {"id", "author", "text", "created_at", "truncated"} == set(body[0])


# REQ-BEADS-008
@pytest.mark.parametrize(
    "path",
    [
        "/api/beads/proj/x-1/comments",
        "/api/beads/nope/a-5/comments",
        "/api/beads/gone/a-5/comments",
    ],
)
def test_beads_008_unknown_bead_or_project_is_404(tmp_path: Path, path: str) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(path).status_code == 404


# REQ-BEADS-008
# REQ-BEADS-003
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_beads_008_unsafe_ids_are_404_and_read_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}/comments").status_code == 404
    assert fake.calls == []


# REQ-BEADS-008
# REQ-BEADS-012 (Unchanged file, Changed file)
def test_beads_008_comments_kept_until_the_file_changes(tmp_path: Path) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")}, comments={"a-5": [comment("a-5")]})
    api = make(tmp_path, fake)
    touch_export(tmp_path, 1_000_000_000)
    api.get("/api/beads/proj/a-5/comments")
    api.get("/api/beads/proj/a-5/comments")
    assert len(fake.calls) == 1
    touch_export(tmp_path, 2_000_000_000)
    api.get("/api/beads/proj/a-5/comments")
    assert len(fake.calls) == 2


# REQ-BEADS-002
def test_beads_002_bugs_over_http(tmp_path: Path) -> None:
    up = {"a-5": [{**related("b-1", "discovered-from"), "issue_type": "bug"}]}
    fake = FakeExport(shown={"a-5": bead("a-5")}, up=up)
    bugs = make(tmp_path, fake).get("/api/beads/proj/a-5").json()["bugs"]
    assert bugs == [
        {"id": "b-1", "title": "Title of b-1", "status": "open", "type": "discovered-from"}
    ]


# REQ-BEADS-009
def test_beads_009_fields_over_http(tmp_path: Path) -> None:
    shown = bead("a-5", created_by="gin", design="D", notes="N")
    api = make(tmp_path, FakeExport([bead("a-1", created_by="gin")], shown={"a-5": shown}))
    detail = api.get("/api/beads/proj/a-5").json()
    assert detail["created_by"] == "gin" and detail["design"] == "D" and detail["notes"] == "N"
    assert detail["acceptance_criteria"] is None and detail["close_reason"] is None
    rows = api.get("/api/beads", params={"project": "proj"}).json()
    assert rows[0]["created_by"] == "gin"


# REQ-BEADS-010
def test_beads_010_blocked_by_over_http(tmp_path: Path) -> None:
    rows = [bead("a-1"), bead("a-2", dependencies=[dep("a-2", "a-1", "blocks")])]
    body = make(tmp_path, FakeExport(rows)).get("/api/beads", params={"project": "proj"}).json()
    by_id = {r["id"]: r for r in body}
    assert by_id["a-1"]["blocked_by"] == [] and by_id["a-2"]["blocked_by"] == ["a-1"]
