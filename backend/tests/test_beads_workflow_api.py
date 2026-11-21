from datetime import UTC, datetime, timedelta
from pathlib import Path

from fake_bd import FakeBd
from fake_export import FakeExport, bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.projects.models import BlockError, EpicWorkflow


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class Runner:
    def __init__(self, result: EpicWorkflow | BlockError) -> None:
        self.result = result
        self.calls: list[tuple[Path, str]] = []

    def __call__(self, path: Path, epic_id: str) -> EpicWorkflow | BlockError:
        self.calls.append((path, epic_id))
        return self.result


OK = EpicWorkflow(
    stage="execute", gates={"plan": "done", "execute": "in_progress"}, warnings=["stale spec"]
)


def make(tmp_path: Path, runner: Runner, clock: Clock | None = None) -> TestClient:
    (tmp_path / "proj").mkdir(exist_ok=True)
    (tmp_path / "dist").mkdir(exist_ok=True)
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
        read_beads=FakeExport([bead("e-1", issue_type="epic")]),
        run_bd=FakeBd(),
        clock=clock or Clock(),
        run_epic_workflow=runner,
    )
    return TestClient(app, raise_server_exceptions=False)


URL = "/api/beads/proj/e-1/workflow"


# REQ-BEADS-020
def test_beads_020_stage_of_an_epic(tmp_path: Path) -> None:
    runner = Runner(OK)
    r = make(tmp_path, runner).get(URL)
    assert r.status_code == 200
    assert r.json() == {
        "stage": "execute",
        "gates": {"plan": "done", "execute": "in_progress"},
        "warnings": ["stale spec"],
        "review_waivers": [],
    }
    assert runner.calls == [(tmp_path / "proj", "e-1")]


# REQ-BEADS-020
def test_beads_020_command_fails_is_502_and_not_cached(tmp_path: Path) -> None:
    runner = Runner(BlockError(error="gin: boom"))
    api = make(tmp_path, runner)
    r = api.get(URL)
    assert r.status_code == 502 and r.json() == {"error": "gin: boom"}
    assert api.get(URL).status_code == 502
    assert len(runner.calls) == 2


# REQ-BEADS-020
def test_beads_020_unknown_bead_or_project_is_404_without_a_command(tmp_path: Path) -> None:
    runner = Runner(OK)
    api = make(tmp_path, runner)
    assert api.get("/api/beads/proj/nope-9/workflow").status_code == 404
    assert api.get("/api/beads/proj/bad id/workflow").status_code == 404
    assert api.get("/api/beads/other/e-1/workflow").status_code == 404
    assert api.get("/api/beads/gone/e-1/workflow").status_code == 404
    assert runner.calls == []


# REQ-BEADS-020
def test_beads_020_cached_for_sixty_seconds(tmp_path: Path) -> None:
    runner = Runner(OK)
    clock = Clock()
    api = make(tmp_path, runner, clock)
    api.get(URL)
    clock.now += timedelta(seconds=30)
    api.get(URL)
    assert len(runner.calls) == 1
    clock.now += timedelta(seconds=31)
    api.get(URL)
    assert len(runner.calls) == 2


# REQ-BEADS-020
def test_beads_020_refresh_drops_the_cache(tmp_path: Path) -> None:
    runner = Runner(OK)
    api = make(tmp_path, runner)
    api.get(URL)
    assert api.post("/api/refresh").status_code == 204
    api.get(URL)
    assert len(runner.calls) == 2
