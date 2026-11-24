import json
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import FakeExport, bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 2, 12, 0, tzinfo=UTC)

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
        read_beads=lambda cwd: runners[cwd.name](cwd),
        run_bd=FakeBd(),
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def closed(
    ident: str, days_ago: float, now: datetime | None = None, **extra: Any
) -> dict[str, Any]:
    at = (now or Clock().now) - timedelta(days=days_ago)
    return bead(ident, status="closed", closed_at=at.isoformat(), **extra)


# REQ-REPORTS-001
def test_reports_001_default_period_is_30_days(tmp_path: Path) -> None:
    fake = FakeExport([closed("a-1", 3), closed("a-2", 20), closed("a-3", 40)])
    body = make(tmp_path, {"alpha": fake}).get("/api/reports", params={"project": "alpha"}).json()
    assert body["totals"]["closed"] == 2
    assert body["days"] == 30


# REQ-REPORTS-001
def test_reports_001_no_ai_usage_in_the_answer(tmp_path: Path) -> None:
    fake = FakeExport([closed("a-1", 3, metadata={"ai_usage": {"version": 1}})])
    body = make(tmp_path, {"alpha": fake}).get("/api/reports", params={"project": "alpha"}).json()
    assert set(body) == {
        "generated_at",
        "project",
        "days",
        "milestone",
        "totals",
        "delivery",
        "quality",
    }
    assert set(body["totals"]) == {"closed", "rework_rate"}
    assert body["delivery"]["overall"]["key"] == "all"


# REQ-REPORTS-001
def test_reports_001_milestone_takes_its_scope(tmp_path: Path) -> None:
    fake = FakeExport(
        [
            bead(
                "m2", issue_type="milestone", metadata={"start": "2026-11-02", "end": "2026-11-27"}
            ),
            bead(
                "m3", issue_type="milestone", metadata={"start": "2026-11-30", "end": "2026-12-25"}
            ),
            bead("e-1", issue_type="epic", parent="m2"),
            closed("t-1", 50, parent="e-1"),
            bead("e-9", issue_type="epic", parent="m3"),
            closed("t-9", 3, parent="e-9"),
        ]
    )
    api = make(tmp_path, {"alpha": fake})
    body = api.get("/api/reports", params={"project": "alpha", "milestone": "m2"}).json()
    assert body["milestone"] == "m2"
    assert body["days"] is None
    assert body["totals"]["closed"] == 1


# REQ-REPORTS-001
# REQ-BEADS-004
def test_reports_001_cached_for_60_seconds(tmp_path: Path) -> None:
    fake, clock = FakeExport([closed("a-1", 3)]), Clock()
    api = make(tmp_path, {"alpha": fake}, clock)
    first = api.get("/api/reports", params={"project": "alpha"}).json()
    clock.now += timedelta(seconds=20)
    second = api.get("/api/reports", params={"project": "alpha"}).json()
    assert second["generated_at"] == first["generated_at"]
    clock.now += timedelta(seconds=41)
    third = api.get("/api/reports", params={"project": "alpha"}).json()
    assert third["generated_at"] != first["generated_at"]  # built again
    assert len(fake.calls) == 1  # from the same read: the file did not change


# REQ-REPORTS-001
def test_reports_001_bad_input(tmp_path: Path) -> None:
    fake = FakeExport(
        [
            bead(
                "m2", issue_type="milestone", metadata={"start": "2026-11-02", "end": "2026-11-27"}
            ),
            closed("a-1", 3),
        ]
    )
    api = make(tmp_path, {"alpha": fake})
    assert api.get("/api/reports", params={"project": "nope"}).status_code == 404
    for extra in (
        {"days": "14"},
        {"milestone": "a b"},
        {"milestone": ""},
        {"milestone": "m2", "days": "7"},
    ):
        r = api.get("/api/reports", params={"project": "alpha", **extra})
        assert r.status_code == 422 and "error" in r.json()
    assert fake.calls == []
    gone = api.get("/api/reports", params={"project": "alpha", "milestone": "gone"})
    assert gone.status_code == 404 and gone.json() == {"error": "unknown milestone"}


# REQ-REPORTS-001
def test_reports_001_all_is_not_a_project(tmp_path: Path) -> None:
    fake = FakeExport([closed("a-1", 3)])
    api = make(tmp_path, {"alpha": fake})
    assert api.get("/api/reports", params={"project": "all"}).status_code == 404
    assert fake.calls == []


# REQ-REPORTS-007
def test_reports_007_single_project_failure_is_502_and_not_cached(tmp_path: Path) -> None:
    fake = FakeExport(failure=BeadsError("boom"))
    api = make(tmp_path, {"alpha": fake})
    for _ in range(2):
        r = api.get("/api/reports", params={"project": "alpha"})
        assert r.status_code == 502 and r.json() == {"error": "boom"}
    assert len(fake.calls) == 2


# REQ-REPORTS-001
# REQ-BEADS-012
def test_reports_001_refresh_drops_the_cached_report(tmp_path: Path) -> None:
    fake = FakeExport([closed("a-1", 3)])
    api = make(tmp_path, {"alpha": fake})
    api.get("/api/reports", params={"project": "alpha"})
    fake.beads = [closed("a-1", 3), closed("a-2", 2)]
    assert api.post("/api/refresh").status_code == 204
    body = api.get("/api/reports", params={"project": "alpha"}).json()
    assert len(fake.calls) == 2 and body["totals"]["closed"] == 2


# REQ-REPORTS-019
def test_reports_019_missing_or_broken_log_does_not_fail_the_report(tmp_path: Path) -> None:
    client = make(
        tmp_path, {"alpha": FakeExport([closed("a-1", 3)]), "beta": FakeExport([closed("b-1", 3)])}
    )
    log = tmp_path / "beta" / ".beads" / "interactions.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    reopen = {
        "kind": "field_change",
        "issue_id": "b-1",
        "extra": {"field": "status", "old_value": "closed", "new_value": "open"},
    }
    log.write_text(
        'not json\n{"kind": "field_change", "issue_id": "b-1"}\n' + json.dumps(reopen) + "\n"
    )
    response = client.get("/api/reports", params={"project": "beta"})
    assert response.status_code == 200
    body = response.json()
    assert body["totals"]["closed"] == 1
    beta = next(m for m in body["quality"]["members"] if m["member"] == "Unassigned")
    assert (beta["closed"], beta["reopens"]) == (1, 1)
