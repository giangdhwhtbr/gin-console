from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_gw import LIST, SHOW, FakeGw
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.milestones.source import MilestonesError


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 29, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


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
        claude_home=tmp_path,
        run_gw=fake,
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


# REQ-MILESTONE-UI-008
def test_milestone_ui_008_list(tmp_path: Path) -> None:
    body = make(tmp_path, FakeGw()).get("/api/milestones", params={"project": "proj"}).json()
    assert body["unassigned_epics"] == 3 and body["today"] == "2026-10-29"
    assert body["milestones"][0]["epics"] == {"total": 6, "closed": 0}
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
