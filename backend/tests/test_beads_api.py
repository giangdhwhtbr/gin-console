import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import FakeExport, bead, comment, dep, related, write_export
from fake_git import FakeGit
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.pull import FETCH_ARGS, BdRunner, PullRun, run_bd_pull
from gin_console.beads.source import BeadsError, read_export
from gin_console.config import ProjectEntry, Settings

CONFLICT = (
    "Error: merge origin/main: Error 1105: Merge conflict detected, "
    "@autocommit transaction rolled back."
)


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any = None, run_bd: BdRunner | None = None) -> TestClient:
    """An app over project `proj` whose rows come from `fake`; `proj` has an export file so the
    snapshot is kept until that file changes. Without `fake`, the real reader reads that file.
    Pulls go to `run_bd`, a FakeBd unless given."""
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
        read_beads=read_export if fake is None else fake,
        run_bd=run_bd or FakeBd(),
        run_git=FakeGit(),
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


# REQ-BEADS-019
def test_beads_019_gate_relation_carries_waits_for_over_http(tmp_path: Path) -> None:
    plan = ".planning/plans/x.md"
    rows = [
        bead("e-1", issue_type="epic"),
        bead(
            "e-1.2",
            description=f"Plan: {plan}, Track 2\nLane: be",
            dependencies=[dep("e-1.2", "e-1", "parent-child")],
        ),
        bead(
            "e-1.4",
            dependencies=[dep("e-1.4", "e-1", "parent-child"), dep("e-1.4", "g-1", "blocks")],
        ),
        bead("g-1", title=f"external: {plan}#2"),
    ]
    body = make(tmp_path, FakeExport(rows)).get("/api/beads/proj/e-1.4").json()
    gate_relation = next(d for d in body["dependencies"] if d["id"] == "g-1")
    assert gate_relation["waits_for"] == {
        "plan": plan,
        "number": 2,
        "track_id": "e-1.2",
        "lane": "be",
    }
    assert body["waits_for"] is None


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
# TC: TC-BEADS-001@6288a8a0
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "..%2Fx", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_tc_beads_001_option_like_ids_are_404_and_read_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeExport(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}").status_code == 404
    assert fake.calls == []


# REQ-BEADS-003 (Odd closed value)
# TC: TC-BEADS-002@b98cf8a8
@pytest.mark.parametrize("closed", ["../x", "true", "", "0", "11", "1&closed=0"])
def test_tc_beads_002_odd_closed_values_mean_not_closed(tmp_path: Path, closed: str) -> None:
    api = make(tmp_path, FakeExport(FOUR + CLOSED))
    response = api.get("/api/beads", params={"project": "proj", "closed": closed})
    assert response.status_code == 200 and len(response.json()) == 4


# REQ-BEADS-003 (No bd process): reading routes start no bd, even with the real bd runner
# TC: TC-BEADS-004@ff272254
def test_tc_beads_004_no_bd_process(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    started: list[list[str]] = []

    def run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        started.append(cmd)
        if Path(cmd[0]).stem == "bd":
            raise AssertionError(f"bd started: {cmd}")
        return subprocess.CompletedProcess(cmd, 0, "", "")

    def popen(cmd: list[str], *args: Any, **kwargs: Any) -> None:
        raise AssertionError(f"process started: {cmd}")

    monkeypatch.setattr(subprocess, "run", run)
    monkeypatch.setattr(subprocess, "Popen", popen)
    write_export(tmp_path / "proj", [*FOUR, bead("a-5", comments=[comment("a-5")])])
    api = make(tmp_path, run_bd=run_bd_pull)  # the default reader and bd runner
    for path in (
        "/api/beads?project=proj",
        "/api/beads/proj/a-5",
        "/api/beads/proj/a-5/comments",
        "/api/projects/beads",
        "/api/reports?project=proj",
    ):
        assert api.get(path).status_code == 200, path
    assert started == []  # no process at all
    project = next(p for p in api.get("/api/projects/beads").json() if p["name"] == "proj")
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


# REQ-BEADS-003 (Only pull)
# TC: TC-BEADS-058@ca3bb958
def test_tc_beads_058_refresh_only_runs_bd_dolt_pull(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    started: list[tuple[list[str], Path]] = []

    def run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        started.append((cmd, kwargs["cwd"]))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    def popen(cmd: list[str], *args: Any, **kwargs: Any) -> None:
        raise AssertionError(f"process started: {cmd}")

    monkeypatch.setattr(subprocess, "run", run)
    monkeypatch.setattr(subprocess, "Popen", popen)
    for name in ("one", "two"):
        write_export(tmp_path / name, FOUR)
    settings = Settings(
        projects=[ProjectEntry(name=n, path=tmp_path / n) for n in ("one", "two")]
    )
    api = TestClient(create_app(settings, static_dir=tmp_path / "dist"))
    assert api.post("/api/refresh").status_code == 204  # the default bd runner
    pull = ["bd", "dolt", "pull"]
    fetch = ["git", *FETCH_ARGS]  # the attachment fetch of ADR 0006 follows each pull
    assert sorted(started) == [
        (pull, tmp_path / "one"),
        (pull, tmp_path / "two"),
        (fetch, tmp_path / "one"),
        (fetch, tmp_path / "two"),
    ]


# REQ-BEADS-012 (Refresh): the pull ends before the caches are dropped
def test_beads_012_refresh_pulls_then_reads_again(tmp_path: Path) -> None:
    fake = FakeExport(FOUR)
    bd = FakeBd()
    clients: list[TestClient] = []
    during_pull: list[tuple[int, int]] = []  # (status of a list request, reads after it)

    def run_bd(cwd: Path) -> PullRun:
        # a list request while the pull runs; a snapshot it fills must still be dropped after
        status = clients[0].get("/api/beads", params={"project": "proj"}).status_code
        during_pull.append((status, len(fake.calls)))
        return bd(cwd)

    clients.append(make(tmp_path, fake, run_bd))
    api = clients[0]
    api.get("/api/beads", params={"project": "proj"})
    response = api.post("/api/refresh")
    assert response.status_code == 204 and response.content == b""
    assert bd.calls == [tmp_path / "proj"]  # pulled before the response; `gone` has no directory
    api.get("/api/beads", params={"project": "proj"})
    assert during_pull == [(200, 1)]  # the snapshot from before the refresh was still kept
    assert len(fake.calls) == 2  # and the first list request after the refresh read again
    assert api.get("/api/projects/beads").json()[0]["pull"]["status"] == "ok"


# REQ-BEADS-012, REQ-BEADS-016: an unexpected runner error does not fail the refresh
def test_beads_012_refresh_survives_a_runner_error(tmp_path: Path) -> None:
    fake = FakeExport(FOUR)
    api = make(tmp_path, fake, FakeBd({tmp_path / "proj": RuntimeError("boom")}))
    api.get("/api/beads", params={"project": "proj"})
    assert api.post("/api/refresh").status_code == 204
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 2  # the caches were dropped
    pull = api.get("/api/projects/beads").json()[0]["pull"]
    assert (pull["status"], pull["error"]) == ("error", "bd dolt pull failed")


# REQ-BEADS-012 (Refresh after a failed pull), REQ-BEADS-016: `/api/projects/beads` shows `pull`
# TC: TC-BEADS-059@b3371fbb
def test_tc_beads_059_refresh_after_a_failed_pull(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = FakeExport(FOUR)
    api = make(tmp_path, fake, FakeBd({tmp_path / "proj": PullRun(1, f"{CONFLICT}\n")}))
    api.get("/api/beads", params={"project": "proj"})
    assert [p["pull"] for p in api.get("/api/projects/beads").json()] == [None, None]
    assert api.post("/api/refresh").status_code == 204
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 2  # the caches were dropped
    failed = {"at": "2026-10-20T03:00:00Z", "status": "error", "error": CONFLICT}
    pulls = {p["name"]: p["pull"] for p in api.get("/api/projects/beads").json()}
    assert pulls == {"proj": failed, "gone": None}


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
# TC: TC-BEADS-010@630bceae
def test_tc_beads_010_one_malformed_bead_does_not_fail_the_list(tmp_path: Path) -> None:
    fake = FakeExport([bead("a-1"), bead("a-2", title=7), bead("a-3")])
    response = make(tmp_path, fake).get("/api/beads", params={"project": "proj"})
    assert response.status_code == 200
    assert [b["id"] for b in response.json()] == ["a-1", "a-3"]


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
    api = make(tmp_path, FakeExport([bead("m1", issue_type="milestone"), bead("t1")]))
    project = next(p for p in api.get("/api/projects/beads").json() if p["name"] == "proj")
    assert project["beads"]["ready"] == 1
    rows = api.get("/api/beads", params={"project": "proj"}).json()
    assert {b["id"]: b["ready"] for b in rows} == {"m1": False, "t1": True}


# REQ-BEADS-005 (Missing file)
# TC: TC-BEADS-008@4a2d405b
def test_tc_beads_008_missing_file_502(tmp_path: Path) -> None:
    api = make(tmp_path)  # the default reader; proj has no .beads/issues.jsonl
    for path in ("/api/beads?project=proj", "/api/beads/proj/a-1", "/api/beads/proj/a-1/comments"):
        response = api.get(path)
        assert response.status_code == 502
        error = response.json()["error"]
        assert ".beads/issues.jsonl" in error and "bd config set export.auto true" in error
        assert "bd config set export.interval 1s" in error


# REQ-BEADS-005 (Malformed line)
# TC: TC-BEADS-009@5cbfd87c
def test_tc_beads_009_malformed_line_502(tmp_path: Path) -> None:
    path = write_export(tmp_path / "proj", [bead("a-1")])
    path.write_text(path.read_text() + "[1, 2]\n")
    response = make(tmp_path).get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502
    assert "a line that is not a JSON object" in response.json()["error"]


# REQ-BEADS-005
def test_beads_005_bad_utf8_in_an_epic_title_answers_200(tmp_path: Path) -> None:
    epic = bead("e-1", title="x@y", issue_type="epic", status="in_progress")
    path = write_export(tmp_path / "proj", [epic])
    path.write_bytes(path.read_bytes().replace(b"x@y", b"x\xffy"))
    api = make(tmp_path)  # the default reader
    projects = api.get("/api/projects/beads")
    assert projects.status_code == 200
    proj = next(p for p in projects.json() if p["name"] == "proj")
    assert proj["beads"]["epics"] == [
        {
            "id": "e-1",
            "title": "x\ufffdy",
            "status": "in_progress",
            "workflow": None,
        }
    ]
    assert api.get("/api/reports", params={"project": "proj"}).status_code == 200
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200


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


# REQ-BEADS-001
def test_beads_001_kind_capabilities_complexity_and_estimate(tmp_path: Path) -> None:
    """Scenario: Kind, capabilities and estimate."""
    epic = bead(
        "e-1",
        issue_type="epic",
        labels=["kind:technical"],
        description="Capabilities: beads, ui (new)\nComplexity: medium (two views)",
        estimated_minutes=960,
    )
    track = bead(
        "t-1",
        labels=["req:REQ-MILESTONE-UI-019"],
        dependencies=[dep("t-1", "e-1", "parent-child")],
    )
    api = make(tmp_path, FakeExport([epic, track]))
    body = {b["id"]: b for b in api.get("/api/beads", params={"project": "proj"}).json()}
    assert body["e-1"]["kind"] == "technical"
    assert body["e-1"]["capabilities"] == ["beads", "milestone-ui", "ui"]
    assert body["e-1"]["complexity"] == "medium"
    assert body["e-1"]["estimate_minutes"] == 960
    assert body["t-1"]["kind"] is None
    assert body["t-1"]["capabilities"] == ["milestone-ui"]
    assert "description" not in body["e-1"]


# REQ-BEADS-001
def test_beads_001_kind_defaults(tmp_path: Path) -> None:
    """Scenario: Defaults."""
    api = make(tmp_path, FakeExport([bead("e-2", issue_type="epic")]))
    (item,) = api.get("/api/beads", params={"project": "proj"}).json()
    assert item["kind"] == "capability"
    assert item["capabilities"] == []
    assert item["complexity"] is None
    assert item["estimate_minutes"] is None


# REQ-BEADS-001
@pytest.mark.parametrize("minutes", [0, -5, "60", 1.5, True, None])
def test_beads_001_malformed_estimate_is_null(tmp_path: Path, minutes: Any) -> None:
    api = make(tmp_path, FakeExport([bead("a-1", estimated_minutes=minutes)]))
    (item,) = api.get("/api/beads", params={"project": "proj"}).json()
    assert item["estimate_minutes"] is None and item["capabilities"] == []


PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100


def put_png(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(PNG)


# REQ-BEADS-001 (Image count)
def test_beads_001_image_count(tmp_path: Path) -> None:
    for name in ("a.png", "b.png"):
        put_png(tmp_path / "proj" / "shots" / name)
    rows = [
        bead("b-1", issue_type="bug", description="shots/a.png\nshots/b.png\nshots/gone.png"),
        bead("t-1", description="nothing to see"),
    ]
    body = make(tmp_path, FakeExport(rows)).get("/api/beads", params={"project": "proj"}).json()
    assert {b["id"]: b["image_count"] for b in body} == {"b-1": 2, "t-1": 0}


# REQ-BEADS-002 (Images)
def test_beads_002_images(tmp_path: Path) -> None:
    put_png(tmp_path / "proj" / "qa/evidence/r1/01.png")
    outside = tmp_path / "x.png"
    put_png(outside)
    shown = bead(
        "b-1", issue_type="bug", description=f"qa/evidence/r1/01.png and {outside.as_posix()}"
    )
    api = make(tmp_path, FakeExport(shown={"b-1": shown, "t-1": bead("t-1")}))
    assert api.get("/api/beads/proj/b-1").json()["images"] == [
        {
            "n": 1,
            "path": "qa/evidence/r1/01.png",
            "sha256": None,
            "caption": "01.png",
            "available": True,
            "served_as": "file",
            "reason": None,
        },
        {
            "n": 2,
            "path": outside.as_posix(),
            "sha256": None,
            "caption": "x.png",
            "available": False,
            "served_as": None,
            "reason": None,
        },
    ]
    assert api.get("/api/beads/proj/t-1").json()["images"] == []
