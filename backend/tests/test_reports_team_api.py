import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_export import FakeExport, bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, runners: dict[str, Any], clock: Clock | None = None) -> TestClient:
    (tmp_path / "dist").mkdir(exist_ok=True)
    for name in ("alpha", "beta"):  # an export file each, so a snapshot is kept until it changes
        write_export(tmp_path / name, [])
    settings = Settings(
        projects=[
            ProjectEntry(name="alpha", path=tmp_path / "alpha"),
            ProjectEntry(name="beta", path=tmp_path / "beta"),
        ]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        claude_home=tmp_path,
        read_beads=lambda cwd: runners[cwd.name](cwd),
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def milestone(ident: str, start: str, end: str, **fields: Any) -> dict[str, Any]:
    meta = {"start": start, "end": end, **fields.pop("meta", {})}
    return bead(ident, issue_type="milestone", metadata=meta, **fields)


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
            milestone("m2", "2026-11-02", "2026-11-27", meta={"kickoff": "2026-11-02"}),
            bead("e1", issue_type="epic", parent="m2"),
            bead("t1", parent="e1", assignee="ann"),
        ]
    )


def get(api: TestClient, **params: str) -> Any:
    return api.get("/api/reports/team", params={"project": "alpha", **params})


# REQ-REPORTS-008
def test_reports_008_api_default_and_named(tmp_path: Path) -> None:
    api = make(tmp_path, {"alpha": alpha()})
    r = get(api)
    assert r.status_code == 200
    assert r.json()["milestone"] == "m2"
    assert [b["id"] for b in r.json()["beads"]] == ["t1"]
    assert get(api, milestone="m1").json()["milestone"] == "m1"
    assert get(api, milestone="gone").json()["milestone"] == "m2"


# REQ-REPORTS-008
def test_reports_008_api_no_milestones(tmp_path: Path) -> None:
    api = make(tmp_path, {"beta": FakeExport([bead("b-1")])})
    body = api.get("/api/reports/team", params={"project": "beta"}).json()
    assert body["milestones"] == []
    assert body["milestone"] is None


# REQ-REPORTS-008
def test_reports_008_api_bad_input(tmp_path: Path) -> None:
    fake = alpha()
    api = make(tmp_path, {"alpha": fake})
    assert get(api, project="nope").status_code == 404
    assert api.get("/api/reports/team").status_code == 404
    r = get(api, milestone="a b")
    assert r.status_code == 422 and "error" in r.json()
    assert fake.calls == []


# REQ-REPORTS-008
def test_reports_008_api_cache_and_refresh(tmp_path: Path) -> None:
    clock = Clock()
    api = make(tmp_path, {"alpha": alpha()}, clock)
    first = get(api).json()["generated_at"]
    clock.now += timedelta(seconds=20)
    assert get(api).json()["generated_at"] == first
    assert api.post("/api/refresh").status_code == 204
    second = get(api).json()["generated_at"]
    assert second != first
    clock.now += timedelta(seconds=61)
    assert get(api).json()["generated_at"] != second


# REQ-REPORTS-008
def test_reports_008_api_no_process(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def boom(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("a process was started")

    api = make(tmp_path, {"alpha": alpha()})
    monkeypatch.setattr(subprocess, "run", boom)
    monkeypatch.setattr(subprocess, "Popen", boom)
    assert get(api).status_code == 200


# REQ-REPORTS-008
def test_reports_008_api_unreadable(tmp_path: Path) -> None:
    fake = FakeExport(failure=BeadsError("boom"))
    api = make(tmp_path, {"alpha": fake})
    for _ in range(2):
        r = get(api)
        assert r.status_code == 502 and r.json() == {"error": "boom"}
    assert len(fake.calls) == 2


# REQ-REPORTS-008
def test_reports_008_api_invalid_dates(tmp_path: Path) -> None:
    fake = FakeExport([milestone("m1", "2026-13-45", "2026-12-31")])
    r = get(make(tmp_path, {"alpha": fake}))
    assert r.status_code == 200
    assert r.json()["undated"] == 1
