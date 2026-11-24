import json
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import FakeExport, bead, write_export
from fake_gw import FakeGw
from fakes import Fake
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)  # a Monday

    def __call__(self) -> datetime:
        return self.now


class Runners:
    """The runners the app is given: none of them may be called by a report."""

    def __init__(self) -> None:
        self.bd = FakeBd()
        self.gw = FakeGw()

    def calls(self) -> int:
        return len(self.bd.calls) + len(self.gw.calls)


def make(
    tmp_path: Path,
    exports: dict[str, Any],
    clock: Clock | None = None,
    runners: Runners | None = None,
) -> TestClient:
    (tmp_path / "dist").mkdir(exist_ok=True)
    for name in ("alpha", "beta"):  # an export file each, so a snapshot is kept until it changes
        write_export(tmp_path / name, [])
    settings = Settings(
        projects=[
            ProjectEntry(name="alpha", path=tmp_path / "alpha"),
            ProjectEntry(name="beta", path=tmp_path / "beta"),
        ]
    )
    held = runners or Runners()
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        read_beads=lambda cwd: exports[cwd.name](cwd),
        run_gw=held.gw,
        run_bd=held.bd,
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
            milestone("m2", "2026-11-09", "2026-12-02", meta={"kickoff": "2026-11-11"}),
            milestone("m3", "2026-12-07", "2026-12-31"),
            bead(
                "e1",
                issue_type="epic",
                parent="m2",
                created_at="2026-11-02T10:00:00Z",
                metadata={
                    "points": 8,
                    "points_history": [
                        {"from": None, "to": 5, "at": "2026-11-03T08:00:00Z"},
                        {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
                    ],
                },
            ),
            bead("t1", parent="e1", assignee="ann", created_at="2026-11-12T10:00:00Z"),
        ]
    )


def get(api: TestClient, **params: str) -> Any:
    return api.get("/api/reports/status", params={"project": "alpha", **params})


# REQ-REPORTS-020
def test_reports_020_default_milestone(tmp_path: Path) -> None:
    api = make(tmp_path, {"alpha": alpha()})
    r = get(api)
    assert r.status_code == 200
    body = r.json()
    assert (body["milestone"], body["days"]) == ("m2", None)
    assert [m["id"] for m in body["milestones"]] == ["m1", "m2", "m3"]
    assert body["period"] == {
        "kickoff": "2026-11-11",
        "working_days": 18,
        "elapsed": 11,
        "days_left": 7,
    }
    assert body["kpis"]["beads"]["scope"] == 1
    assert body["burnup"][0] == {"day": "2026-11-11", "scope_points": 5, "done_points": 0}
    assert [e["id"] for e in body["epics"]] == ["e1"]
    assert body["risks"] == {"blocked": [], "blocked_more": 0, "unestimated": []}
    # the change keys of the contract are `from` and `to`
    assert body["changes"]["items"] == [
        {
            "day": "2026-11-16",
            "kind": "re_estimated",
            "id": "e1",
            "title": "Title of e1",
            "points": None,
            "from": 5,
            "to": 8,
            "epic": None,
            "person": None,
        }
    ]
    assert get(api, milestone="m1").json()["milestone"] == "m1"
    assert get(api, milestone="gone").json()["milestone"] == "m2"  # the default, not a 404


# REQ-REPORTS-020
def test_reports_020_period(tmp_path: Path) -> None:
    recent = "2026-11-18T10:00:00Z"
    beads = [bead(f"c{n}", status="closed", closed_at=recent) for n in range(5)]
    api = make(
        tmp_path, {"alpha": FakeExport([*beads, milestone("m2", "2026-11-09", "2026-12-02")])}
    )
    log = tmp_path / "alpha" / ".beads" / "interactions.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    reopen = {
        "kind": "field_change",
        "issue_id": "c0",
        "created_at": "2026-11-19T10:00:00Z",
        "extra": {"field": "status", "old_value": "closed", "new_value": "open"},
    }
    log.write_text(json.dumps(reopen) + "\n")
    body = get(api, days="30").json()
    assert (body["milestone"], body["period"], body["days"]) == (None, None, 30)
    assert body["kpis"]["beads"]["done"] == 5
    assert body["kpis"]["rework"]["rate"] == 0.2
    assert body["kpis"]["points"]["scope"] is None
    assert (body["burnup"], body["epics"], body["changes"]["items"]) == ([], [], [])
    assert body["risks"] == {"blocked": [], "blocked_more": 0, "unestimated": []}


# REQ-REPORTS-020
def test_reports_020_no_process_and_cache(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake = Fake()
    monkeypatch.setattr(subprocess, "run", fake)
    clock = Clock()
    runners = Runners()
    api = make(tmp_path, {"alpha": alpha()}, clock, runners)
    first = get(api).json()["generated_at"]
    clock.now += timedelta(seconds=20)
    assert get(api).json()["generated_at"] == first
    assert fake.calls == [] and runners.calls() == 0  # no `gin` and no `bd`
    assert api.post("/api/refresh").status_code == 204  # drops the cache
    assert get(api).json()["generated_at"] != first


# REQ-REPORTS-020
def test_reports_020_cache_expires_and_is_per_scope(tmp_path: Path) -> None:
    clock = Clock()
    fake = alpha()
    api = make(tmp_path, {"alpha": fake}, clock)
    first = get(api).json()["generated_at"]
    clock.now += timedelta(seconds=30)
    assert get(api, days="7").json()["generated_at"] != first
    clock.now += timedelta(seconds=31)
    assert get(api).json()["generated_at"] != first


# REQ-REPORTS-020
def test_reports_020_bad_input(tmp_path: Path) -> None:
    fake = alpha()
    api = make(tmp_path, {"alpha": fake})
    assert get(api, project="nope").status_code == 404
    assert api.get("/api/reports/status").status_code == 404
    for extra in ({"days": "14"}, {"milestone": "a b"}, {"milestone": "m2", "days": "7"}):
        r = get(api, **extra)
        assert r.status_code == 422 and "error" in r.json()
    assert fake.calls == []  # refused before the snapshot is read


# REQ-REPORTS-020
def test_reports_020_unreadable_snapshot(tmp_path: Path) -> None:
    fake = FakeExport(failure=BeadsError("boom"))
    api = make(tmp_path, {"alpha": fake})
    for _ in range(2):
        r = get(api)
        assert r.status_code == 502 and r.json() == {"error": "boom"}
    assert len(fake.calls) == 2  # the failure is not cached


# REQ-REPORTS-020
def test_reports_020_no_milestones(tmp_path: Path) -> None:
    api = make(tmp_path, {"alpha": FakeExport([bead("b-1")])})
    body = get(api).json()
    assert (body["milestones"], body["milestone"], body["period"]) == ([], None, None)
    assert body["kpis"]["blocked"] == {"count": 0, "oldest_days": None}
