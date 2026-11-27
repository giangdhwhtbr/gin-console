"""The readiness checklist of a milestone over HTTP (REQ-QA-009, and REQ-QA-002 for it)."""

import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import FakeExport, bead, write_export
from fake_gin import FakeGin, req, trace
from fake_gin_qa import EXPORT, FakeGinQa, case, export
from fake_gw import SHOW, FakeGw
from fastapi.testclient import TestClient
from test_auth_api import auth_app, sign_in

from gin_console.app import create_app
from gin_console.beads.errors import BeadsError
from gin_console.config import ProjectEntry, Settings
from gin_console.milestones.source import MilestonesError
from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.qa.readiness import GATES
from gin_console.qa.source import QaError
from gin_console.requirements.source import RequirementsError

KEYS = ["cases", "results", "bugs", "gates"]


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 27, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class Gates:
    """Stands in for `gin state` per epic: every gate satisfied, but those of `unmet` and the
    epics of `failing`; logs each call and the peak of calls running at once."""

    def __init__(
        self,
        unmet: dict[str, str] | None = None,
        failing: set[str] | None = None,
        delay: float = 0.0,
    ) -> None:
        self.unmet = unmet or {}
        self.failing = failing or set()
        self.delay = delay
        self.calls: list[tuple[Path, str]] = []
        self.peak = 0
        self._running = 0
        self._lock = threading.Lock()

    def __call__(self, cwd: Path, epic_id: str) -> EpicWorkflow | BlockError:
        with self._lock:
            self.calls.append((cwd, epic_id))
            self._running += 1
            self.peak = max(self.peak, self._running)
        try:
            if self.delay:
                time.sleep(self.delay)
        finally:
            with self._lock:
                self._running -= 1
        if epic_id in self.failing:
            return BlockError(error=f"gin state of {epic_id} failed")
        gates = dict.fromkeys(GATES, "satisfied")
        if epic_id in self.unmet:
            gates[self.unmet[epic_id]] = "pending"
        return EpicWorkflow(stage="implement", gates=gates)

    def epics(self) -> list[str]:
        return sorted(epic for _, epic in self.calls)


def epic(ident: str, status: str = "open") -> dict[str, Any]:
    return {**SHOW["epics"][0], "id": ident, "title": f"Title of {ident}", "status": status}


def shown(ident: str, *epics: str) -> dict[str, Any]:
    return {**SHOW, "id": ident, "title": f"Title of {ident}", "epics": [epic(e) for e in epics]}


def changed(ident: str, epic_id: str) -> dict[str, Any]:
    change = {"change": f"c-{epic_id}", "epic": epic_id, "op": "added", "archived": None}
    return req(ident, capability="ui", changes=[change])


TRACE = trace(changed("REQ-UI-001", "e1"), changed("REQ-UI-002", "e2"))
CASES = export(case("TC-UI-001"), case("TC-UI-002", reqs=[{"id": "REQ-UI-002", "hash8": "x"}]))


def rows(milestone: str, *epics: str) -> list[dict[str, Any]]:
    """The export snapshot: the milestone, its epics, and an open P2 bug of the first epic."""
    epic_rows = [bead(e, issue_type="epic", parent=milestone) for e in epics]
    bugs = [bead("b-1", issue_type="bug", priority=2, parent=epics[0])] if epics else []
    return [bead(milestone, issue_type="milestone"), *epic_rows, *bugs]


class Sources:
    """The fakes of one app: `gin milestone show`, `gin specs trace`, gin-qa and `gin state`."""

    def __init__(
        self,
        show: dict[str, Any],
        gw: FakeGw | None = None,
        gin: FakeGin | None = None,
        qa: FakeGinQa | None = None,
        gates: Gates | None = None,
    ) -> None:
        self.gw = gw or FakeGw({"list": {}, "show": show})
        self.gin = gin or FakeGin({"trace": TRACE})
        self.qa = qa or FakeGinQa({EXPORT: CASES})
        self.gates = gates or Gates()

    def called(self) -> bool:
        return bool(self.gw.calls or self.gin.calls or self.qa.calls or self.gates.calls)


def make(tmp_path: Path, sources: Sources, clock: Clock | None = None, **kwargs: Any) -> TestClient:
    """Projects `alpha` and `beta`, and `gone` whose directory is missing."""
    for name in ("alpha", "beta", "dist"):
        (tmp_path / name).mkdir(exist_ok=True)
    settings = Settings(
        projects=[
            ProjectEntry(name=name, path=tmp_path / name) for name in ("alpha", "beta", "gone")
        ]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        run_gw=sources.gw,
        run_gin=sources.gin,
        run_gin_qa=sources.qa,
        run_epic_workflow=sources.gates,
        clock=clock or Clock(),
        run_bd=FakeBd(),
        schedule_pulls=False,
        **kwargs,
    )
    return TestClient(app, raise_server_exceptions=False)


def readiness(client: TestClient, milestone: str = "m2", project: str = "alpha") -> Any:
    return client.get(f"/api/qa/readiness/{project}/{milestone}")


def states(body: dict[str, Any]) -> dict[str, str]:
    return {item["key"]: item["state"] for item in body["items"]}


# REQ-QA-009: Checklist served
def test_qa_009_checklist_served(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1", "e2", "e3"))
    qa = FakeGinQa({EXPORT: export(case("TC-UI-001"))})  # REQ-UI-002 has no case
    sources = Sources(shown("m2", "e1", "e2", "e3"), qa=qa, gates=Gates(unmet={"e3": "shipped"}))
    res = readiness(make(tmp_path, sources))
    assert res.status_code == 200
    body = res.json()
    assert body["milestone"] == {"id": "m2", "title": "Title of m2"}
    assert body["epics"] == [
        {"id": e, "title": f"Title of {e}", "status": "open"} for e in ("e1", "e2", "e3")
    ]
    assert body["generated_at"] == "2026-11-27T03:00:00Z"
    assert body["verdict"] == "not_ready"
    assert [item["key"] for item in body["items"]] == KEYS
    assert states(body) == {"cases": "fail", "results": "pass", "bugs": "pass", "gates": "fail"}
    assert body["items"][0] == {
        "key": "cases",
        "title": "Every requirement has a case",
        "state": "fail",
        "note": None,
        "error": None,
        "requirements": [{"id": "REQ-UI-002", "title": "Lock out", "capability": "ui"}],
        "cases": [],
        "bugs": [],
        "epics": [],
    }
    assert body["items"][3]["epics"] == [{"id": "e3", "title": "Title of e3", "gate": "shipped"}]
    assert sources.gw.calls == [["milestone", "show", "m2", "--json"]]
    assert sources.gin.calls == [["specs", "trace", "--all", "--format", "json"]]
    assert sources.gates.epics() == ["e1", "e2", "e3"]
    assert {cwd for cwd, _ in sources.gates.calls} == {tmp_path / "alpha"}


# REQ-QA-009: Gates fan out
def test_qa_009_gates_fan_out(tmp_path: Path) -> None:
    epics = [f"e{n}" for n in range(10)]
    write_export(tmp_path / "alpha", rows("m4", *epics))
    gates = Gates(delay=0.05)
    client = make(tmp_path, Sources(shown("m4", *epics), gates=gates))
    assert readiness(client, "m4").status_code == 200
    assert 1 < gates.peak <= 4
    assert gates.epics() == sorted(epics)
    assert readiness(client, "m4").status_code == 200
    assert gates.epics() == sorted(epics)  # the second answer started no `gin state`


# REQ-QA-009: the gates and the trace are forgotten on refresh
def test_qa_009_refresh_runs_gates_again(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1", "e2"))
    sources = Sources(shown("m2", "e1", "e2"))
    client = make(tmp_path, sources)
    assert readiness(client).status_code == 200
    assert client.post("/api/refresh").status_code == 204
    assert readiness(client).status_code == 200
    assert sources.gates.epics() == ["e1", "e1", "e2", "e2"]
    assert len(sources.gin.calls) == 2
    assert len(sources.qa.calls) == 2


# REQ-QA-009: each epic's gates are kept 60 seconds, the trace as REQ-REQUIREMENTS-006 says
def test_qa_009_gates_kept_sixty_seconds(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1"))
    sources, clock = Sources(shown("m2", "e1")), Clock()
    client = make(tmp_path, sources, clock)
    readiness(client)
    clock.now += timedelta(seconds=59)
    readiness(client)
    assert (sources.gates.epics(), len(sources.gin.calls)) == (["e1"], 1)
    clock.now += timedelta(seconds=2)
    readiness(client)
    assert (sources.gates.epics(), len(sources.gin.calls)) == (["e1", "e1"], 2)


# REQ-QA-009: a failed `gin state` is not kept, the gates of the other epics are
def test_qa_009_failed_gates_not_kept(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1", "e2"))
    sources = Sources(shown("m2", "e1", "e2"), gates=Gates(failing={"e2"}))
    client = make(tmp_path, sources)
    body = readiness(client).json()
    gates = body["items"][3]
    assert gates["state"] == "unknown"
    assert gates["epics"] == [{"id": "e2", "title": "Title of e2", "gate": "unknown"}]
    assert "gin state of e2 failed" in gates["error"]
    assert body["verdict"] == "unknown"
    readiness(client)
    assert sources.gates.epics() == ["e1", "e2", "e2"]


# REQ-QA-009: Unknown milestone
def test_qa_009_unknown_milestone(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", [*rows("m2", "e1"), bead("t-1")])
    sources = Sources(shown("m2", "e1"))
    client = make(tmp_path, sources)
    for milestone in ("m9", "e1", "t-1", "bad id"):  # absent, not a milestone, not an id
        assert readiness(client, milestone).status_code == 404
    assert not sources.called()


# REQ-QA-009: 502 with `error` when `gin milestone show` fails
def test_qa_009_milestone_show_fails(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1"))
    gw = FakeGw(failures={"show": MilestonesError("milestone m2 has no start")})
    sources = Sources({}, gw=gw)
    res = readiness(make(tmp_path, sources))
    assert res.status_code == 502
    assert res.json() == {"error": "milestone m2 has no start"}
    assert not (sources.gin.calls or sources.qa.calls or sources.gates.calls)


# REQ-QA-009: a failing trace makes `cases` and `results` unknown; `bugs` and `gates` are worked out
def test_qa_009_failing_trace(tmp_path: Path) -> None:
    write_export(
        tmp_path / "alpha",
        [*rows("m2", "e1", "e2"), bead("b-2", issue_type="bug", priority=1, parent="e1")],
    )
    gin = FakeGin({"trace": RequirementsError("gin specs trace timed out")})
    sources = Sources(shown("m2", "e1", "e2"), gin=gin, gates=Gates(unmet={"e2": "shipped"}))
    client = make(tmp_path, sources)
    body = readiness(client).json()
    assert states(body) == {
        "cases": "unknown",
        "results": "unknown",
        "bugs": "fail",
        "gates": "fail",
    }
    assert [body["items"][i]["error"] for i in range(4)] == [
        "gin specs trace timed out",
        "gin specs trace timed out",
        None,
        None,
    ]
    assert [b["id"] for b in body["items"][2]["bugs"]] == ["b-2"]
    assert body["verdict"] == "not_ready"
    readiness(client)
    assert len(gin.calls) == 2  # a failure is not kept


# REQ-QA-009: no gin-qa makes `cases` and `results` unknown, and fails nothing else
def test_qa_009_no_gin_qa(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1"))
    qa = FakeGinQa({EXPORT: QaError("gin-qa is not installed on the console host", "missing")})
    body = readiness(make(tmp_path, Sources(shown("m2", "e1"), qa=qa))).json()
    assert states(body) == {
        "cases": "unknown",
        "results": "unknown",
        "bugs": "pass",
        "gates": "pass",
    }
    assert body["items"][0]["error"] == "gin-qa is not installed on the console host"
    assert body["verdict"] == "unknown"


# REQ-QA-009: the export comes from the cache of REQ-QA-003
def test_qa_009_export_from_the_qa_cache(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1"))
    sources = Sources(shown("m2", "e1"))
    client = make(tmp_path, sources)
    assert client.get("/api/qa/cases", params={"project": "alpha"}).status_code == 200
    assert readiness(client).status_code == 200
    assert len(sources.qa.calls) == 1


# REQ-QA-009: an export snapshot that cannot be read makes `bugs` unknown, not the milestone 404
def test_qa_009_snapshot_unreadable(tmp_path: Path) -> None:
    sources = Sources(shown("m2", "e1"))
    failing = FakeExport(failure=BeadsError("issues.jsonl has a line that is not JSON"))
    body = readiness(make(tmp_path, sources, read_beads=failing)).json()
    bugs = body["items"][2]
    assert (bugs["state"], bugs["error"]) == ("unknown", "issues.jsonl has a line that is not JSON")
    assert states(body)["gates"] == "pass"


# REQ-QA-002: a project not configured or whose directory is missing is not found
def test_qa_002_readiness_no_project(tmp_path: Path) -> None:
    sources = Sources(shown("m2", "e1"))
    client = make(tmp_path, sources)
    for project in ("nope", "gone"):
        assert readiness(client, project=project).status_code == 404
    assert not sources.called()


# REQ-QA-002: Hidden project, for the readiness of a milestone
def test_qa_002_readiness_hidden_project(tmp_path: Path) -> None:
    sources = Sources(shown("m2", "e1"))
    app = auth_app(
        tmp_path,
        run_gw=sources.gw,
        run_gin=sources.gin,
        run_gin_qa=sources.qa,
        run_epic_workflow=sources.gates,
    )
    write_export(tmp_path / "b", rows("m2", "e1"))
    an, root = TestClient(app.app), TestClient(app.app)
    sign_in(an, "an")  # may see only `a`
    sign_in(root, "root")
    assert an.get("/api/qa/readiness/b/m2").status_code == 404
    assert not sources.called()
    assert root.get("/api/qa/readiness/b/m2").status_code == 200
