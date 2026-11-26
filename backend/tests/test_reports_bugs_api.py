"""GET /api/reports/bugs (REQ-REPORTS-039), through the app with a fake export."""

import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_export import FakeExport, bead
from fastapi.testclient import TestClient
from test_reports_team_api import Clock as TeamClock
from test_reports_team_api import make, milestone

from gin_console.beads.source import BeadsError


class Clock(TeamClock):
    def __init__(self) -> None:
        super().__init__()
        self.now = datetime(2026, 11, 25, 12, 0, tzinfo=UTC)  # the local date is 2026-11-25


def alpha() -> FakeExport:
    return FakeExport(
        [
            milestone(
                "m1",
                "2026-10-05",
                "2026-10-30",
                status="closed",
                closed_at="2026-10-31T12:00:00Z",
            ),
            milestone("m2", "2026-11-16", "2026-12-04", meta={"kickoff": "2026-11-16"}),
            milestone("m3", "2026-12-07", "2026-12-18"),
            bead("e1", issue_type="epic", title="Epic one", parent="m2"),
            bead("b1", issue_type="bug", created_at="2026-11-20T12:00:00Z", parent="e1"),
        ]
    )


def get(api: TestClient, **params: str) -> Any:
    return api.get("/api/reports/bugs", params={"project": "alpha", **params})


def api_for(tmp_path: Path, fake: FakeExport, clock: Clock | None = None) -> TestClient:
    return make(tmp_path, {"alpha": fake}, clock or Clock())


# REQ-REPORTS-039
def test_req_reports_039_api_milestone(tmp_path: Path) -> None:
    r = get(api_for(tmp_path, alpha()))
    assert r.status_code == 200
    body = r.json()
    assert (body["milestone"], body["days"], body["today"]) == ("m2", None, "2026-11-25")
    assert body["period"] == {"start": "2026-11-16", "end": "2026-11-25"}
    assert body["figures"]["opened"] == 1
    assert [e["id"] for e in body["epics"]] == ["e1"]
    assert [b["id"] for b in body["open"]] == ["b1"]
    assert body["open"][0]["epic"] == {"id": "e1", "title": "Epic one"}


# REQ-REPORTS-039
def test_req_reports_039_api_closed_milestone(tmp_path: Path) -> None:
    body = get(api_for(tmp_path, alpha()), milestone="m1").json()
    assert body["milestone"] == "m1"
    assert body["period"] == {"start": "2026-10-05", "end": "2026-10-30"}


# REQ-REPORTS-039
def test_req_reports_039_api_period(tmp_path: Path) -> None:
    body = get(api_for(tmp_path, alpha()), days="7").json()
    assert (body["milestone"], body["days"]) == (None, 7)
    assert body["period"] == {"start": "2026-11-18", "end": "2026-11-25"}


# REQ-REPORTS-039
def test_req_reports_039_api_not_started(tmp_path: Path) -> None:
    body = get(api_for(tmp_path, alpha()), milestone="m3").json()
    assert body["period"] is None and body["weeks"] == []
    assert (body["figures"]["opened"], body["figures"]["closed"]) == (0, 0)
    assert [b["id"] for b in body["open"]] == ["b1"]


# REQ-REPORTS-039
def test_req_reports_039_api_no_milestones(tmp_path: Path) -> None:
    fake = FakeExport([bead("b-1", issue_type="bug", created_at="2026-11-20T12:00:00Z")])
    api = make(tmp_path, {"beta": fake}, Clock())
    body = api.get("/api/reports/bugs", params={"project": "beta"}).json()
    assert (body["milestone"], body["days"], body["period"]) == (None, None, None)
    assert [b["id"] for b in body["open"]] == ["b-1"]


# REQ-REPORTS-039
def test_req_reports_039_api_cache_and_refresh(tmp_path: Path) -> None:
    clock = Clock()
    api = api_for(tmp_path, alpha(), clock)
    first = get(api, milestone="m2").json()["generated_at"]
    clock.now += timedelta(seconds=20)
    assert get(api, milestone="m2").json()["generated_at"] == first
    assert api.post("/api/refresh").status_code == 204
    assert get(api, milestone="m2").json()["generated_at"] != first


# REQ-REPORTS-039
def test_req_reports_039_api_no_process(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("a process was started")

    api = api_for(tmp_path, alpha())
    monkeypatch.setattr(subprocess, "run", boom)
    monkeypatch.setattr(subprocess, "Popen", boom)
    assert get(api).status_code == 200


# REQ-REPORTS-039
def test_req_reports_039_api_bad_input(tmp_path: Path) -> None:
    fake = alpha()
    api = api_for(tmp_path, fake)
    assert get(api, project="nope").status_code == 404
    assert api.get("/api/reports/bugs").status_code == 404
    for extra in ({"milestone": "a b"}, {"days": "14"}, {"milestone": "m2", "days": "7"}):
        r = get(api, **extra)
        assert r.status_code == 422 and "error" in r.json()
    assert fake.calls == []


# REQ-REPORTS-039
def test_req_reports_039_api_unreadable_then_readable(tmp_path: Path) -> None:
    good = alpha()
    calls: list[Path] = []

    def runner(cwd: Path) -> Any:
        calls.append(cwd)
        if len(calls) == 1:
            raise BeadsError("boom")
        return good(cwd)

    api = make(tmp_path, {"alpha": runner}, Clock())
    failed = get(api)
    assert failed.status_code == 502 and failed.json() == {"error": "boom"}
    assert get(api).status_code == 200  # the failure was not cached
