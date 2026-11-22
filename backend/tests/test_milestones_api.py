import json
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_export import bead, dep, write_export
from fake_gw import LIST, SHOW, FakeGw
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.errors import BeadsError
from gin_console.config import ProjectEntry, Settings
from gin_console.milestones.source import MilestonesError, run_gw


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 29, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class Cli:
    """A stand-in for subprocess.run, so the real `run_gw` reads the exit code and stderr."""

    def __init__(self, code: int = 0, output: Any = None, stderr: str = "") -> None:
        self.code = code
        self.output = output
        self.stderr = stderr
        self.calls: list[tuple[list[str], Path]] = []

    def __call__(self, cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        self.calls.append((cmd, kwargs["cwd"]))
        return subprocess.CompletedProcess(cmd, self.code, json.dumps(self.output), self.stderr)


def make(tmp_path: Path, fake: Any, clock: Clock | None = None) -> TestClient:
    (tmp_path / "proj").mkdir(exist_ok=True)
    (tmp_path / "dist").mkdir(exist_ok=True)
    settings = Settings(
        projects=[
            ProjectEntry(name="proj", path=tmp_path / "proj"),
            ProjectEntry(name="gone", path=tmp_path / "gone"),
        ]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        run_gw=fake,
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_list(tmp_path: Path) -> None:
    body = make(tmp_path, FakeGw()).get("/api/milestones", params={"project": "proj"}).json()
    assert body["unassigned_epics"] == 3 and body["today"] == "2026-10-29"
    # REQ-MILESTONE-UI-025: no export in the project, so the fallback counts
    assert body["milestones"][0]["epics"] == {
        "total": 6,
        "closed": 0,
        "in_progress": 0,
        "blocked": 0,
        "ready": 6,
        "deferred": 0,
    }
    assert "schema" not in body


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_show_is_cached_and_preview_is_not(tmp_path: Path) -> None:
    fake = FakeGw()
    api = make(tmp_path, fake)
    for _ in range(2):
        assert api.get("/api/milestones/proj/gw-ab1").status_code == 200
    assert len(fake.calls) == 1
    for _ in range(2):
        response = api.get("/api/milestones/proj/gw-ab1", params={"start": "2026-11-16"})
        assert response.status_code == 200
    assert (
        fake.calls[1:] == [["milestone", "show", "gw-ab1", "--start", "2026-11-16", "--json"]] * 2
    )


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_cache_expires(tmp_path: Path) -> None:
    fake, clock = FakeGw(), Clock()
    api = make(tmp_path, fake, clock)
    api.get("/api/milestones", params={"project": "proj"})
    clock.now += timedelta(seconds=6)
    api.get("/api/milestones", params={"project": "proj"})
    assert len(fake.calls) == 2


# REQ-MILESTONE-UI-008
@pytest.mark.parametrize("start", ["next-monday", "2026-02-30"])
def test_milestone_ui_008_invalid_start(tmp_path: Path, start: str) -> None:
    fake = FakeGw()
    response = make(tmp_path, fake).get("/api/milestones/proj/gw-ab1", params={"start": start})
    assert response.status_code == 422 and fake.calls == []


# REQ-MILESTONE-UI-008
@pytest.mark.parametrize(
    "url",
    [
        "/api/milestones?project=nope",
        "/api/milestones?project=gone",
        "/api/milestones",
        "/api/milestones/nope/gw-ab1",
        "/api/milestones/proj/..bad",
    ],
)
def test_milestone_ui_008_unknown_project_or_id_is_404(tmp_path: Path, url: str) -> None:
    fake = FakeGw()
    assert make(tmp_path, fake).get(url).status_code == 404 and fake.calls == []


# REQ-MILESTONE-UI-008
# REQ-MILESTONE-UI-005
@pytest.mark.parametrize("cause", ["outdated", "tracking", "schema", None])
def test_milestone_ui_008_failure_names_its_cause_and_is_not_cached(
    tmp_path: Path, cause: Any
) -> None:
    fake = FakeGw(failure=MilestonesError("why", cause))
    api = make(tmp_path, fake)
    for _ in range(2):
        response = api.get("/api/milestones", params={"project": "proj"})
        assert response.status_code == 502
        assert response.json() == {"error": "why", "cause": cause}
    assert len(fake.calls) == 2


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-022@d4e5de47
def test_tc_milestone_ui_022_list_milestones_of_a_project(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cli = Cli(output=LIST)
    monkeypatch.setattr(subprocess, "run", cli)
    response = make(tmp_path, run_gw).get("/api/milestones", params={"project": "proj"})
    assert response.status_code == 200
    body = response.json()
    assert [m["title"] for m in body["milestones"]] == ["M1"]
    assert body["unassigned_epics"] == 3 and body["today"] == "2026-10-29"
    ((cmd, cwd),) = cli.calls
    assert cmd[-4:] == ["milestone", "list", "--all", "--json"]
    assert cwd == tmp_path / "proj"


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-023@ac0eb459
def test_tc_milestone_ui_023_show_one_milestone_with_a_start_date(tmp_path: Path) -> None:
    fake = FakeGw()
    response = make(tmp_path, fake).get(
        "/api/milestones/proj/gw-ab1", params={"start": "2026-11-16"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "M1" and [e["id"] for e in body["epics"]] == ["gw-rm-x"]
    assert fake.calls == [["milestone", "show", "gw-ab1", "--start", "2026-11-16", "--json"]]


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-024@5153db9d
def test_tc_milestone_ui_024_response_without_start_is_cached_for_5_seconds(
    tmp_path: Path,
) -> None:
    fake, clock = FakeGw(), Clock()
    api = make(tmp_path, fake, clock)
    api.get("/api/milestones", params={"project": "proj"})
    clock.now += timedelta(seconds=4)
    api.get("/api/milestones", params={"project": "proj"})
    assert len(fake.calls) == 1
    clock.now += timedelta(seconds=2)
    api.get("/api/milestones", params={"project": "proj"})
    assert len(fake.calls) == 2


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-025@679343d7
def test_tc_milestone_ui_025_preview_with_start_is_never_cached(tmp_path: Path) -> None:
    fake = FakeGw()
    api = make(tmp_path, fake)
    for _ in range(2):
        api.get("/api/milestones/proj/gw-ab1", params={"start": "2026-11-16"})
    assert fake.calls == [["milestone", "show", "gw-ab1", "--start", "2026-11-16", "--json"]] * 2


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-026@59c7858d
def test_tc_milestone_ui_026_invalid_start_is_rejected_without_a_command(tmp_path: Path) -> None:
    fake = FakeGw()
    response = make(tmp_path, fake).get(
        "/api/milestones/proj/gw-ab1", params={"start": "next-monday"}
    )
    assert response.status_code == 422
    assert fake.calls == []


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-027@a0aac6f2
def test_tc_milestone_ui_027_unknown_project_or_missing_directory_is_404(tmp_path: Path) -> None:
    api = make(tmp_path, FakeGw())
    assert api.get("/api/milestones", params={"project": "nope"}).status_code == 404
    assert api.get("/api/milestones/gone/gw-ab1").status_code == 404


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-028@57a4b2b9
def test_tc_milestone_ui_028_old_gin_workflow_is_502_outdated_and_not_cached(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    cli = Cli(2, stderr="gin: error: argument command: invalid choice: 'milestone'\n")
    monkeypatch.setattr(subprocess, "run", cli)
    api = make(tmp_path, run_gw)
    for _ in range(2):
        response = api.get("/api/milestones", params={"project": "proj"})
        assert response.status_code == 502
        assert response.json()["error"] and response.json()["cause"] == "outdated"
    assert len(cli.calls) == 2


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-029@e1211410
def test_tc_milestone_ui_029_markdown_tracking_is_502_tracking(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    stderr = "milestone error: milestones need providers.task_tracking: beads\n"
    monkeypatch.setattr(subprocess, "run", Cli(1, stderr=stderr))
    response = make(tmp_path, run_gw).get("/api/milestones", params={"project": "proj"})
    assert response.status_code == 502
    assert response.json()["cause"] == "tracking"


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-030@42af2962
def test_tc_milestone_ui_030_schema_other_than_1_is_502_schema(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(subprocess, "run", Cli(output={**LIST, "schema": 2}))
    response = make(tmp_path, run_gw).get("/api/milestones", params={"project": "proj"})
    assert response.status_code == 502
    assert response.json()["cause"] == "schema"


# REQ-MILESTONE-UI-008
# TC: TC-MILESTONE-UI-031@296ef111
def test_tc_milestone_ui_031_other_command_failure_is_502_with_null_cause(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    stderr = "milestone error: unknown milestone gw-ab1\n"
    monkeypatch.setattr(subprocess, "run", Cli(1, stderr=stderr))
    response = make(tmp_path, run_gw).get("/api/milestones/proj/gw-ab1")
    assert response.status_code == 502
    assert response.json() == {"error": "unknown milestone gw-ab1", "cause": None}


FORECAST: dict[str, Any] = {
    "deadline": "2026-12-31",
    "lanes": 1,
    "start": "2026-11-08",
    "finish": "2026-12-23",
    "overflow_days": 0,
    "open_epics": 5,
    "unestimated": 1,
    "error": None,
}


# REQ-MILESTONE-UI-008 forecast and lanes
def test_milestone_ui_008_forecast_and_lanes(tmp_path: Path) -> None:
    listed = {**LIST, "forecast": FORECAST, "milestones": [{**LIST["milestones"][0], "lanes": 2}]}
    api = make(tmp_path, FakeGw({"list": listed, "show": {**SHOW, "lanes": 2}}))
    body = api.get("/api/milestones", params={"project": "proj"}).json()
    assert body["forecast"] == FORECAST
    assert body["milestones"][0]["lanes"] == 2
    assert api.get("/api/milestones/proj/gw-ab1").json()["lanes"] == 2


# REQ-MILESTONE-UI-008 output from an older gin-workflow
def test_milestone_ui_008_older_output_answers_null(tmp_path: Path) -> None:
    api = make(tmp_path, FakeGw())
    body = api.get("/api/milestones", params={"project": "proj"}).json()
    assert body["forecast"] is None
    assert body["milestones"][0]["lanes"] is None
    assert api.get("/api/milestones/proj/gw-ab1").json()["lanes"] is None


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_forecast_null(tmp_path: Path) -> None:
    api = make(tmp_path, FakeGw({"list": {**LIST, "forecast": None}, "show": SHOW}))
    assert api.get("/api/milestones", params={"project": "proj"}).json()["forecast"] is None


def _show_with(epic_extra: dict[str, Any]) -> dict[str, Any]:
    return {**SHOW, "epics": [{**SHOW["epics"][0], **epic_extra}]}


# REQ-MILESTONE-UI-008
@pytest.mark.parametrize("value", [True, False])
def test_milestone_ui_008_spec_confirmed_passes_through(tmp_path: Path, value: bool) -> None:
    api = make(tmp_path, FakeGw({"list": LIST, "show": _show_with({"spec_confirmed": value})}))
    body = api.get("/api/milestones/proj/gw-ab1").json()
    assert body["epics"][0]["spec_confirmed"] is value


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_spec_confirmed_missing_is_null(tmp_path: Path) -> None:
    epic = {k: v for k, v in SHOW["epics"][0].items() if k != "spec_confirmed"}
    api = make(tmp_path, FakeGw({"list": LIST, "show": {**SHOW, "epics": [epic]}}))
    assert api.get("/api/milestones/proj/gw-ab1").json()["epics"][0]["spec_confirmed"] is None


# REQ-MILESTONE-UI-008 entry without dates
def test_milestone_ui_008_entry_without_dates_is_listed(tmp_path: Path) -> None:
    undated = {
        **LIST["milestones"][0],
        "id": "gw-m4",
        "title": "M4",
        "start": None,
        "end": None,
        "error": "M4 has no start/end metadata",
    }
    listed = {**LIST, "milestones": [LIST["milestones"][0], undated]}
    api = make(tmp_path, FakeGw({"list": listed, "show": SHOW}))
    response = api.get("/api/milestones", params={"project": "proj"})
    assert response.status_code == 200
    m4 = response.json()["milestones"][1]
    assert m4["start"] is None and m4["end"] is None
    assert m4["error"] == "M4 has no start/end metadata"


# REQ-MILESTONE-UI-008 schedule facts
def test_milestone_ui_008_schedule_facts_pass_through(tmp_path: Path) -> None:
    warning = {"code": "open_bugs", "count": 2}
    epic = {**SHOW["epics"][0], "remaining_days": 2, "assumed_days": None, "warnings": [warning]}
    away = {"ann": ["2026-11-18..2026-11-20"]}
    show = {**SHOW, "epics": [epic], "integration": "2026-11-24", "deadline": None, "away": away}
    api = make(tmp_path, FakeGw({"list": LIST, "show": show}))
    body = api.get("/api/milestones/proj/gw-ab1").json()
    assert (body["integration"], body["deadline"], body["away"]) == ("2026-11-24", None, away)
    assert body["epics"][0]["remaining_days"] == 2
    assert body["epics"][0]["assumed_days"] is None
    assert body["epics"][0]["warnings"] == [{"code": "open_bugs", "days": None, "count": 2}]


# REQ-MILESTONE-UI-008 older output without schedule facts
def test_milestone_ui_008_older_output_has_no_schedule_facts(tmp_path: Path) -> None:
    body = make(tmp_path, FakeGw()).get("/api/milestones/proj/gw-ab1").json()
    assert (body["integration"], body["deadline"], body["away"]) == (None, None, {})
    assert body["epics"][0]["remaining_days"] is None
    assert body["epics"][0]["assumed_days"] is None
    assert body["epics"][0]["warnings"][0]["count"] is None


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_story_points_through_the_api(tmp_path: Path) -> None:
    dpp = {"value": 1.4, "measured_epics": 6, "assumed": False}
    velocity = {"committed_points": 21, "completed_points": 13, "say_do": 0.62}
    listed = {
        **LIST,
        "days_per_point": dpp,
        "milestones": [{**LIST["milestones"][0], "velocity": velocity}],
    }
    shown = {**SHOW, "velocity": velocity, "epics": [{**SHOW["epics"][0], "points": 8}]}
    api = make(tmp_path, FakeGw({"list": listed, "show": shown}))
    body = api.get("/api/milestones", params={"project": "proj"}).json()
    assert body["days_per_point"] == dpp
    assert body["milestones"][0]["velocity"]["say_do"] == 0.62
    detail = api.get("/api/milestones/proj/gw-ab1").json()
    assert detail["velocity"]["committed_points"] == 21 and detail["epics"][0]["points"] == 8
    old = make(tmp_path, FakeGw())
    assert old.get("/api/milestones", params={"project": "proj"}).json()["days_per_point"] is None
    assert old.get("/api/milestones/proj/gw-ab1").json()["epics"][0]["points"] is None


# REQ-MILESTONE-UI-025
def test_milestone_ui_025_snapshot_unreadable(tmp_path: Path) -> None:
    (tmp_path / "proj").mkdir()
    (tmp_path / "dist").mkdir()
    settings = Settings(projects=[ProjectEntry(name="proj", path=tmp_path / "proj")])

    def unreadable(cwd: Path) -> Any:
        raise BeadsError("no export")

    app = create_app(settings, static_dir=tmp_path / "dist", run_gw=FakeGw(), read_beads=unreadable)
    response = TestClient(app).get("/api/milestones", params={"project": "proj"})
    assert response.status_code == 200
    epics = response.json()["milestones"][0]["epics"]
    assert epics["ready"] == epics["total"] - epics["closed"]


def _list_of(milestone: str) -> dict[str, Any]:
    entry = {**LIST["milestones"][0], "id": milestone, "epics": {"total": 3, "closed": 1}}
    return {**LIST, "milestones": [entry]}


def _epics_of(tmp_path: Path, fake: Any, **kwargs: Any) -> Any:
    (tmp_path / "dist").mkdir(exist_ok=True)
    settings = Settings(projects=[ProjectEntry(name="alpha", path=tmp_path / "alpha")])
    app = create_app(settings, static_dir=tmp_path / "dist", run_gw=fake, **kwargs)
    return TestClient(app).get("/api/milestones", params={"project": "alpha"})


# REQ-MILESTONE-UI-025
# TC: TC-MILESTONE-UI-117@fc50a8f6
def test_tc_milestone_ui_117_list_counts_epics_by_state(tmp_path: Path) -> None:
    def epic(ident: str, **fields: Any) -> dict[str, Any]:
        return bead(
            ident, issue_type="epic", dependencies=[dep(ident, "m1", "parent-child")], **fields
        )

    rows = [
        bead("m1", issue_type="milestone"),
        epic("e-1", status="closed"),
        epic("e-2", status="in_progress"),
        {
            **epic("e-3"),
            "dependencies": [dep("e-3", "m1", "parent-child"), dep("e-3", "x", "blocks")],
        },
        bead("x"),
        epic("e-4"),
    ]
    write_export(tmp_path / "alpha", rows)
    listing = {
        **LIST,
        "milestones": [{**LIST["milestones"][0], "id": "m1", "epics": {"total": 4, "closed": 1}}],
    }
    response = _epics_of(tmp_path, FakeGw({"list": listing, "show": SHOW}))
    assert response.status_code == 200
    assert response.json()["milestones"][0]["epics"] == {
        "total": 4,
        "closed": 1,
        "in_progress": 1,
        "blocked": 1,
        "ready": 1,
        "deferred": 0,
    }


# REQ-MILESTONE-UI-025
# TC: TC-MILESTONE-UI-118@02e548ce
def test_tc_milestone_ui_118_milestone_bead_missing_from_the_export(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", [bead("other")])
    response = _epics_of(tmp_path, FakeGw({"list": _list_of("m2"), "show": SHOW}))
    assert response.status_code == 200
    assert response.json()["milestones"][0]["epics"] == {
        "total": 3,
        "closed": 1,
        "in_progress": 0,
        "blocked": 0,
        "ready": 2,
        "deferred": 0,
    }


# REQ-MILESTONE-UI-025
# TC: TC-MILESTONE-UI-119@bb819130
def test_tc_milestone_ui_119_unreadable_export_falls_back_to_the_list(tmp_path: Path) -> None:
    def unreadable(cwd: Path) -> Any:
        raise BeadsError("no export")

    (tmp_path / "alpha").mkdir()
    response = _epics_of(
        tmp_path, FakeGw({"list": _list_of("m2"), "show": SHOW}), read_beads=unreadable
    )
    assert response.status_code == 200
    milestone = response.json()["milestones"][0]
    assert milestone["id"] == "m2"
    assert milestone["epics"] == {
        "total": 3,
        "closed": 1,
        "in_progress": 0,
        "blocked": 0,
        "ready": 2,
        "deferred": 0,
    }
