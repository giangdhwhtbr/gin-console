"""The case list and the case detail over HTTP (REQ-QA-001 to REQ-QA-004)."""

import json
import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import bead, write_export
from fake_gin_qa import EXPORT, FakeGinQa, case, export
from fastapi.testclient import TestClient
from test_auth_api import auth_app, sign_in

from gin_console.app import create_app
from gin_console.config import ProjectEntry, Settings
from gin_console.qa.source import QaError

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
NOT_FOUND = {"error": "not found"}


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 27, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any, clock: Clock | None = None) -> TestClient:
    """Projects `alpha` and `beta`, and `gone` whose directory is missing."""
    for name in ("alpha", "beta", "dist"):
        (tmp_path / name).mkdir(exist_ok=True)
    settings = Settings(
        projects=[
            ProjectEntry(name=name, path=tmp_path / name) for name in ("alpha", "beta", "gone")
        ]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        run_gin_qa=fake,
        clock=clock or Clock(),
        run_bd=FakeBd(),
        schedule_pulls=False,
    )
    return TestClient(app, raise_server_exceptions=False)


def cases_of(client: TestClient, project: str = "alpha") -> Any:
    return client.get("/api/qa/cases", params={"project": project})


ROWS = export(
    case("TC-UI-002"),
    case("TC-UI-001", type="api", effective_result="outdated", result="passed"),
    case("TC-BEADS-001", capability="beads", result="not run", effective_result="not run"),
)


def counts(name: str, **values: int) -> dict[str, Any]:
    zero = dict.fromkeys(("passed", "failed", "blocked", "not_run", "outdated", "other"), 0)
    return {"name": name, **zero, **values, "total": sum(values.values())}


# REQ-QA-001: Rows and counts
def test_qa_001_rows_and_counts(tmp_path: Path) -> None:
    fake = FakeGinQa({EXPORT: ROWS})
    res = cases_of(make(tmp_path, fake))
    assert res.status_code == 200
    body = res.json()
    assert fake.calls == [(list(EXPORT), tmp_path / "alpha")]
    assert [row["id"] for row in body["cases"]] == ["TC-BEADS-001", "TC-UI-001", "TC-UI-002"]
    assert body["cases"][1] == {
        "id": "TC-UI-001",
        "title": "Title of TC-UI-001",
        "capability": "ui",
        "type": "api",
        "priority": "medium",
        "result": "passed",
        "effective_result": "outdated",
        "reqs": ["REQ-UI-001"],
        "bug": None,
        "file": "qa/cases/ui/TC-UI-001.e2e.md",
    }
    assert body["counts"] == {
        "by_capability": [counts("beads", not_run=1), counts("ui", passed=1, outdated=1)],
        "by_type": [counts("api", outdated=1), counts("e2e", passed=1, not_run=1)],
    }


# REQ-QA-001: Unknown result and new keys
def test_qa_001_unknown_result_and_new_keys(tmp_path: Path) -> None:
    data = export(case("TC-UI-003", effective_result="skipped", flaky=True), case("TC-UI-004"))
    res = cases_of(make(tmp_path, FakeGinQa({EXPORT: data | {"version": 2}})))
    assert res.status_code == 200
    body = res.json()
    assert body["cases"][0]["effective_result"] == "skipped" and "flaky" not in body["cases"][0]
    assert body["counts"]["by_capability"] == [counts("ui", passed=1, other=1)]


# REQ-QA-001: each effective result has its column; a case's bug is kept as written
def test_qa_001_every_result(tmp_path: Path) -> None:
    results = ["passed", "failed", "blocked", "not run", "outdated", "flaky"]
    data = export(
        *(case(f"TC-UI-{n:03}", effective_result=r, bug="b-7") for n, r in enumerate(results))
    )
    body = cases_of(make(tmp_path, FakeGinQa({EXPORT: data}))).json()
    assert body["counts"]["by_type"] == [
        counts("e2e", passed=1, failed=1, blocked=1, not_run=1, outdated=1, other=1)
    ]
    assert {row["bug"] for row in body["cases"]} == {"b-7"}


# REQ-QA-001: a project without cases
def test_qa_001_no_cases(tmp_path: Path) -> None:
    body = cases_of(make(tmp_path, FakeGinQa({EXPORT: export()}))).json()
    assert body == {"cases": [], "counts": {"by_capability": [], "by_type": []}}


# REQ-QA-002: No gin-qa
def test_qa_002_no_gin_qa(tmp_path: Path) -> None:
    message = "gin-qa is not installed on the console host"
    res = cases_of(make(tmp_path, FakeGinQa({EXPORT: QaError(message, "missing")})))
    assert res.status_code == 502 and res.json() == {"error": message, "cause": "missing"}


# REQ-QA-002: Old gin-qa
def test_qa_002_old_gin_qa(tmp_path: Path) -> None:
    old = export({k: v for k, v in case().items() if k != "effective_result"})
    client = make(tmp_path, FakeGinQa({EXPORT: old}))
    for res in (cases_of(client), client.get("/api/qa/cases/alpha/TC-UI-001")):
        assert res.status_code == 502
        assert res.json() == {"error": "this gin-qa has no effective_result", "cause": "outdated"}


# REQ-QA-002: Timeout
def test_qa_002_timeout(tmp_path: Path) -> None:
    res = cases_of(make(tmp_path, FakeGinQa({EXPORT: QaError("gin-qa timed out")})))
    assert res.status_code == 502 and res.json() == {"error": "gin-qa timed out", "cause": None}


# REQ-QA-002: output the server does not understand
def test_qa_002_not_understood(tmp_path: Path) -> None:
    res = cases_of(make(tmp_path, FakeGinQa({EXPORT: export(case(title=None))})))
    assert res.status_code == 502
    assert res.json() == {"error": "gin-qa cases export output was not understood", "cause": None}


# REQ-QA-002: a project that is not configured or whose directory is missing, before any cache
def test_qa_002_unknown_project(tmp_path: Path) -> None:
    fake = FakeGinQa({EXPORT: ROWS})
    client = make(tmp_path, fake)
    for project in ("nope", "gone"):
        assert cases_of(client, project).status_code == 404
        assert client.get(f"/api/qa/cases/{project}/TC-UI-001").status_code == 404
        shot = client.get(f"/api/qa/cases/{project}/TC-UI-001/run/steps/1/screenshot")
        assert shot.status_code == 404 and shot.json() == NOT_FOUND
    assert client.get("/api/qa/cases").status_code == 404
    assert fake.calls == []


# REQ-QA-002: Hidden project
def test_qa_002_hidden_project(tmp_path: Path) -> None:
    fake = FakeGinQa({EXPORT: export(case())})
    app = auth_app(tmp_path, run_gin_qa=fake)
    an = TestClient(app.app)
    sign_in(an, "an")  # may see only `a`
    assert an.get("/api/qa/cases", params={"project": "b"}).status_code == 404
    assert an.get("/api/qa/cases/b/TC-UI-001").status_code == 404
    shot = an.get("/api/qa/cases/b/TC-UI-001/run/steps/1/screenshot")
    assert shot.status_code == 404 and shot.json() == NOT_FOUND
    assert fake.calls == []
    assert an.get("/api/qa/cases", params={"project": "a"}).status_code == 200
    assert fake.calls == [(list(EXPORT), tmp_path / "a")]


# REQ-QA-002: a failure of gin-qa fails no endpoint that does not need it
def test_qa_002_failure_stays_in_qa(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", [bead("p-1")])
    client = make(tmp_path, FakeGinQa({EXPORT: QaError("gin-qa timed out")}))
    assert cases_of(client).status_code == 502
    assert client.get("/api/beads", params={"project": "alpha"}).status_code == 200


# REQ-QA-003: Two readers
def test_qa_003_two_readers(tmp_path: Path) -> None:
    fake = FakeGinQa({EXPORT: ROWS}, delay=0.5)
    client = make(tmp_path, fake)
    answers: list[Any] = []

    def read() -> None:
        res = cases_of(client)
        answers.append((res.status_code, res.json()))

    first = threading.Thread(target=read)
    first.start()
    deadline = time.monotonic() + 5
    while not fake.calls and time.monotonic() < deadline:  # the first export is running
        time.sleep(0.01)
    second = threading.Thread(target=read)
    second.start()
    first.join()
    second.join()
    assert len(fake.calls) == 1
    assert len(answers) == 2 and answers[0] == answers[1] and answers[0][0] == 200


# REQ-QA-003: Refresh
def test_qa_003_refresh(tmp_path: Path) -> None:
    fake = FakeGinQa({EXPORT: ROWS})
    client = make(tmp_path, fake)
    cases_of(client)
    client.get("/api/qa/cases/alpha/TC-UI-001")
    assert len(fake.calls) == 1  # the detail reads the kept export
    assert client.post("/api/refresh").status_code == 204
    cases_of(client)
    assert len(fake.calls) == 2


# REQ-QA-003: Failure
def test_qa_003_failure_not_kept(tmp_path: Path) -> None:
    fake = FakeGinQa({EXPORT: QaError("gin-qa timed out")})
    client = make(tmp_path, fake)
    assert cases_of(client).status_code == 502
    fake.outputs[EXPORT] = ROWS
    assert cases_of(client).status_code == 200
    assert len(fake.calls) == 2


# REQ-QA-003: kept 60 seconds, per project
def test_qa_003_kept_sixty_seconds(tmp_path: Path) -> None:
    clock = Clock()
    fake = FakeGinQa({EXPORT: ROWS})
    client = make(tmp_path, fake, clock)
    cases_of(client)
    clock.now += timedelta(seconds=59)
    cases_of(client)
    assert len(fake.calls) == 1
    cases_of(client, "beta")
    assert [cwd for _, cwd in fake.calls] == [tmp_path / "alpha", tmp_path / "beta"]
    clock.now += timedelta(seconds=2)
    cases_of(client)
    assert len(fake.calls) == 3


def detail(client: TestClient, ident: str) -> Any:
    return client.get(f"/api/qa/cases/alpha/{ident}")


# REQ-QA-004: Failed case with its bug
def test_qa_004_failed_case_with_its_bug(tmp_path: Path) -> None:
    (tmp_path / "alpha").mkdir()
    write_export(
        tmp_path / "alpha",
        [bead("gin-console-3kd", title="Save fails", status="open", priority=1, issue_type="bug")],
    )
    row = case(
        "TC-UI-115",
        result="failed",
        effective_result="failed",
        bug="gin-console-3kd",
        preconditions=["Signed in"],
        steps=["Open the page", "Click save"],
        expected=["It is saved"],
    )
    res = detail(make(tmp_path, FakeGinQa({EXPORT: export(row)})), "TC-UI-115")
    assert res.status_code == 200
    assert res.json() == {
        "id": "TC-UI-115",
        "title": "Title of TC-UI-115",
        "capability": "ui",
        "type": "e2e",
        "priority": "medium",
        "result": "failed",
        "effective_result": "failed",
        "reqs": ["REQ-UI-001"],
        "file": "qa/cases/ui/TC-UI-115.e2e.md",
        "preconditions": ["Signed in"],
        "steps": ["Open the page", "Click save"],
        "expected": ["It is saved"],
        "bug": {"id": "gin-console-3kd", "title": "Save fails", "status": "open", "priority": 1},
        "latest_run": None,
        "latest_run_reason": "no_run",
    }


ONLY_ID = {"title": None, "status": None, "priority": None}


# REQ-QA-004: Bug not in the snapshot
def test_qa_004_bug_not_in_the_snapshot(tmp_path: Path) -> None:
    (tmp_path / "alpha").mkdir()
    write_export(tmp_path / "alpha", [bead("gin-console-3kd")])
    row = case("TC-UI-116", bug="gin-console-zzz")
    res = detail(make(tmp_path, FakeGinQa({EXPORT: export(row)})), "TC-UI-116")
    assert res.status_code == 200 and res.json()["bug"] == {"id": "gin-console-zzz", **ONLY_ID}


# REQ-QA-004: an export snapshot that cannot be read leaves the bug its id and fails nothing
def test_qa_004_snapshot_unreadable(tmp_path: Path) -> None:
    rows = export(case("TC-UI-116", bug="gin-console-3kd"), case("TC-UI-117"))
    client = make(tmp_path, FakeGinQa({EXPORT: rows}))  # no .beads/issues.jsonl
    res = detail(client, "TC-UI-116")
    assert res.status_code == 200 and res.json()["bug"] == {"id": "gin-console-3kd", **ONLY_ID}
    (tmp_path / "alpha" / ".beads").mkdir()
    (tmp_path / "alpha" / ".beads" / "issues.jsonl").write_text("[" * 100000 + "\n")
    assert detail(client, "TC-UI-116").json()["bug"] == {"id": "gin-console-3kd", **ONLY_ID}
    assert detail(client, "TC-UI-117").json()["bug"] is None


# REQ-QA-004: a bead whose fields are not as expected keeps only what is
def test_qa_004_bug_fields(tmp_path: Path) -> None:
    (tmp_path / "alpha").mkdir()
    write_export(tmp_path / "alpha", [bead("b-7", title=7, status="closed", priority="high")])
    res = detail(make(tmp_path, FakeGinQa({EXPORT: export(case(bug="b-7"))})), "TC-UI-001")
    assert res.json()["bug"] == {"id": "b-7", "title": None, "status": "closed", "priority": None}


# REQ-QA-004: Unknown case
def test_qa_004_unknown_case(tmp_path: Path) -> None:
    assert detail(make(tmp_path, FakeGinQa({EXPORT: ROWS})), "TC-UI-999").status_code == 404


# REQ-QA-004, REQ-QA-005: the detail carries the latest run of the case
def test_qa_004_latest_run(tmp_path: Path) -> None:
    run = "qa/evidence/2026-11-23T10-34-33"
    folder = tmp_path / "alpha" / run / "tc-ui-115"
    folder.mkdir(parents=True)
    steps = [{"title": "Open", "status": "passed", "screenshot": "01.png", "error": None}]
    (folder / "result.json").write_text(json.dumps({"status": "passed", "steps": steps}))
    (folder / "01.png").write_bytes(PNG)
    rows = export(case("TC-UI-115", run=run), case("TC-UI-122", run="../outside/r1"))
    client = make(tmp_path, FakeGinQa({EXPORT: rows}))
    body = detail(client, "TC-UI-115").json()
    assert body["latest_run_reason"] is None
    assert body["latest_run"] == {
        "folder": run,
        "status": "passed",
        "started": None,
        "finished": None,
        "error": None,
        "steps": [{"n": 1, "title": "Open", "status": "passed", "error": None, "screenshot": True}],
    }
    refused = detail(client, "TC-UI-122").json()
    assert (refused["latest_run"], refused["latest_run_reason"]) == (None, "invalid")
