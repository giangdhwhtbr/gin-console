import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_gin import FakeGin, req, trace
from fake_git import FakeGit
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.requirements.source import RequirementsError


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 25, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any) -> TestClient:
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
        run_gin=fake,
        run_bd=FakeBd(),
        run_git=FakeGit(),
        clock=Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


REQS = {
    "requirements": [
        {
            "id": "REQ-AUTH-001",
            "title": "Lock out",
            "source": "open.md",
            "section": "ADDED",
            "scenarios": [],
        },
        {
            "id": "REQ-AUTH-001",
            "title": "Lock out",
            "source": "spec.md",
            "section": "LIVING",
            "scenarios": [
                {"title": "One", "given": ["g"], "when": ["w"], "then": ["t"]},
                {"title": "Two", "given": [], "when": [], "then": []},
            ],
        },
    ]
}


# REQ-REQUIREMENTS-004
def test_requirements_004_scenarios(tmp_path: Path) -> None:
    client = make(tmp_path, FakeGin({"reqs": REQS}))
    body = client.get("/api/requirements/reqs/proj/REQ-AUTH-001").json()
    assert body["source"] == "spec.md"
    assert [s["title"] for s in body["scenarios"]] == ["One", "Two"]
    assert body["scenarios"][0]["then"] == ["t"]


# REQ-REQUIREMENTS-004
def test_requirements_004_removed_is_404(tmp_path: Path) -> None:
    client = make(tmp_path, FakeGin({"reqs": REQS}))
    assert client.get("/api/requirements/reqs/proj/REQ-AUTH-099").status_code == 404


# REQ-REQUIREMENTS-005
def test_requirements_005_old_gin(tmp_path: Path) -> None:
    fake = FakeGin({"trace": RequirementsError("old", "outdated")})
    res = make(tmp_path, fake).get("/api/requirements", params={"project": "proj"})
    assert res.status_code == 502 and res.json() == {"error": "old", "cause": "outdated"}


# REQ-REQUIREMENTS-005
def test_requirements_005_timeout(tmp_path: Path) -> None:
    fake = FakeGin({"trace": RequirementsError("gin timed out")})
    res = make(tmp_path, fake).get("/api/requirements", params={"project": "proj"})
    assert res.status_code == 502 and "timed out" in res.json()["error"]


# REQ-REQUIREMENTS-005: scenarios fail alone
def test_requirements_005_scenarios_fail_alone(tmp_path: Path) -> None:
    fake = FakeGin({"trace": trace(req()), "reqs": RequirementsError("boom")})
    client = make(tmp_path, fake)
    assert client.get("/api/requirements", params={"project": "proj"}).status_code == 200
    assert client.get("/api/requirements/reqs/proj/REQ-AUTH-001").status_code == 502
    assert [c[1] for c in fake.calls] == ["trace", "reqs"]


# REQ-REQUIREMENTS-005
def test_requirements_005_unknown_project(tmp_path: Path) -> None:
    client = make(tmp_path, FakeGin({"trace": trace(), "reqs": REQS}))
    assert client.get("/api/requirements", params={"project": "nope"}).status_code == 404
    assert client.get("/api/requirements/reqs/nope/REQ-AUTH-001").status_code == 404
    assert client.get("/api/requirements", params={"project": "gone"}).status_code == 404
    assert client.get("/api/requirements/reqs/gone/REQ-AUTH-001").status_code == 404


# REQ-REQUIREMENTS-006: two readers
def test_requirements_006_two_readers(tmp_path: Path) -> None:
    started = threading.Event()
    release = threading.Event()
    calls: list[list[str]] = []

    def slow(args: list[str], cwd: Path) -> Any:
        calls.append(args)
        started.set()
        release.wait(5)
        return trace(req())

    client = make(tmp_path, slow)
    results: list[int] = []

    def read() -> None:
        results.append(client.get("/api/requirements", params={"project": "proj"}).status_code)

    first = threading.Thread(target=read)
    first.start()
    assert started.wait(5)
    second = threading.Thread(target=read)
    second.start()
    release.set()
    first.join()
    second.join()
    assert results == [200, 200] and len(calls) == 1


# REQ-REQUIREMENTS-006: refresh
def test_requirements_006_refresh(tmp_path: Path) -> None:
    fake = FakeGin({"trace": trace(req())})
    client = make(tmp_path, fake)
    client.get("/api/requirements", params={"project": "proj"})
    client.get("/api/requirements", params={"project": "proj"})
    assert len(fake.calls) == 1
    client.post("/api/refresh")
    client.get("/api/requirements", params={"project": "proj"})
    assert len(fake.calls) == 2


# REQ-REQUIREMENTS-006: failure is not kept
def test_requirements_006_failure_not_kept(tmp_path: Path) -> None:
    fake = FakeGin({"trace": RequirementsError("boom")})
    client = make(tmp_path, fake)
    client.get("/api/requirements", params={"project": "proj"})
    client.get("/api/requirements", params={"project": "proj"})
    assert len(fake.calls) == 2


# REQ-REQUIREMENTS-001: endpoint answer
def test_requirements_001_endpoint(tmp_path: Path) -> None:
    fake = FakeGin({"trace": trace(req(beads=None), warnings=["beads: bd exited 1"])})
    body = make(tmp_path, fake).get("/api/requirements", params={"project": "proj"}).json()
    assert body["requirements"][0]["beads"] is None
    assert body["warnings"] == ["beads: bd exited 1"] and body["layout"] == "sdd"
