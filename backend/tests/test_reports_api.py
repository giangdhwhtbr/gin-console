from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fake_bd import FakeBd, bead
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
    for name in ("alpha", "beta", "dist"):
        (tmp_path / name).mkdir(exist_ok=True)
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
        run_bd=lambda args, cwd, **kw: runners[cwd.name](args, cwd, **kw),
        clock=clock or Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def closed(
    ident: str, days_ago: float, now: datetime | None = None, **extra: Any
) -> dict[str, Any]:
    at = (now or Clock().now) - timedelta(days=days_ago)
    return bead(ident, status="closed", closed_at=at.isoformat(), **extra)


def usage(tokens: int) -> dict[str, Any]:
    return {
        "ai_usage": {
            "version": 1,
            "models": {"m": {"input": tokens}},
            "stages": {"execute": {"tokens": tokens}},
        }
    }


# REQ-REPORTS-001
def test_reports_001_default_period_is_30_days(tmp_path: Path) -> None:
    fake = FakeBd([closed("a-1", 3), closed("a-2", 20), closed("a-3", 40)])
    body = make(tmp_path, {"alpha": fake}).get("/api/reports", params={"project": "alpha"}).json()
    assert body["totals"]["closed"] == 2
    assert body["days"] == 30


# REQ-REPORTS-003, REQ-REPORTS-004
def test_reports_003_004_new_fields_in_json(tmp_path: Path) -> None:
    fake = FakeBd([closed("a-1", 3)])
    body = make(tmp_path, {"alpha": fake}).get("/api/reports", params={"project": "alpha"}).json()
    assert "cache_ratio" in body["totals"]
    assert body["delivery"]["overall"]["key"] == "all"


# REQ-REPORTS-001
def test_reports_001_sprint_takes_the_labelled_epic_tree(tmp_path: Path) -> None:
    fake = FakeBd(
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
def test_reports_001_cached_for_60_seconds(tmp_path: Path) -> None:
    fake, clock = FakeBd([closed("a-1", 3)]), Clock()
    api = make(tmp_path, {"alpha": fake}, clock)
    first = api.get("/api/reports", params={"project": "alpha"}).json()
    clock.now += timedelta(seconds=20)
    second = api.get("/api/reports", params={"project": "alpha"}).json()
    assert len(fake.calls) == 1
    assert second["generated_at"] == first["generated_at"]
    clock.now += timedelta(seconds=41)
    api.get("/api/reports", params={"project": "alpha"})
    assert len(fake.calls) == 2


# REQ-REPORTS-001
def test_reports_001_bad_input_runs_no_bd(tmp_path: Path) -> None:
    fake = FakeBd([closed("a-1", 3)])
    api = make(tmp_path, {"alpha": fake})
    assert api.get("/api/reports", params={"project": "nope"}).status_code == 404
    for extra in ({"days": "14"}, {"sprint": "a b"}, {"sprint": ""}):
        r = api.get("/api/reports", params={"project": "alpha", **extra})
        assert r.status_code == 422 and "error" in r.json()
    assert fake.calls == []


# REQ-REPORTS-007
def test_reports_007_one_project_failing_in_all_is_listed(tmp_path: Path) -> None:
    runners = {
        "alpha": FakeBd([closed("a-1", 3)]),
        "beta": FakeBd(failure=BeadsError("boom")),
    }
    r = make(tmp_path, runners).get("/api/reports", params={"project": "all"})
    assert r.status_code == 200
    body = r.json()
    assert body["errors"] == [{"project": "beta", "error": "boom"}]
    assert body["totals"]["closed"] == 1


# REQ-REPORTS-007
def test_reports_007_every_project_failing_in_all_is_502(tmp_path: Path) -> None:
    runners = {
        "alpha": FakeBd(failure=BeadsError("boom")),
        "beta": FakeBd(failure=BeadsError("bang")),
    }
    r = make(tmp_path, runners).get("/api/reports", params={"project": "all"})
    assert r.status_code == 502
    assert "alpha" in r.json()["error"] and "beta" in r.json()["error"]


# REQ-REPORTS-007
def test_reports_007_single_project_failure_is_502_and_not_cached(tmp_path: Path) -> None:
    fake = FakeBd(failure=BeadsError("boom"))
    api = make(tmp_path, {"alpha": fake})
    for _ in range(2):
        r = api.get("/api/reports", params={"project": "alpha"})
        assert r.status_code == 502 and r.json() == {"error": "boom"}
    assert len(fake.calls) == 2


# REQ-REPORTS-007
def test_reports_007_members_are_merged_across_projects(tmp_path: Path) -> None:
    runners = {
        "alpha": FakeBd([closed("a-1", 3, assignee="ann", metadata=usage(100))]),
        "beta": FakeBd([closed("b-1", 3, assignee="ann", metadata=usage(200))]),
    }
    body = make(tmp_path, runners).get("/api/reports", params={"project": "all"}).json()
    ann = [m for m in body["usage"]["members"] if m["member"] == "ann"]
    assert len(ann) == 1
    assert ann[0]["closed"] == 2 and ann[0]["tokens"] == 300
