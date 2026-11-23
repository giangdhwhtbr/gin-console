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
        "sprint",
        "totals",
        "delivery",
        "quality",
    }
    assert set(body["totals"]) == {"closed", "rework_rate"}
    assert body["delivery"]["overall"]["key"] == "all"


# REQ-REPORTS-001
def test_reports_001_sprint_takes_the_labelled_epic_tree(tmp_path: Path) -> None:
    fake = FakeExport(
        [
            closed("a-1", 60, issue_type="epic", labels=["sprint:s7"]),
            closed("a-1.1", 50, parent="a-1"),
            closed("a-2", 5, issue_type="epic"),
        ]
    )
    api = make(tmp_path, {"alpha": fake})
    body = api.get("/api/reports", params={"project": "alpha", "sprint": "s7"}).json()
    assert body["sprint"] == "s7"
    assert body["totals"]["closed"] == 2


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
def test_reports_001_bad_input_reads_nothing(tmp_path: Path) -> None:
    fake = FakeExport([closed("a-1", 3)])
    api = make(tmp_path, {"alpha": fake})
    assert api.get("/api/reports", params={"project": "nope"}).status_code == 404
    for extra in ({"days": "14"}, {"sprint": "a b"}, {"sprint": ""}):
        r = api.get("/api/reports", params={"project": "alpha", **extra})
        assert r.status_code == 422 and "error" in r.json()
    assert fake.calls == []


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
