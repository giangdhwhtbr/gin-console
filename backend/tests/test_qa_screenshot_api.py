"""The screenshot of a step of a case's latest run over HTTP (REQ-QA-006)."""

import json
from pathlib import Path

from fake_gin_qa import EXPORT, FakeGinQa, case, export
from fastapi.testclient import TestClient
from test_qa_api import make

from gin_console.qa.source import QaError

RUN = "qa/evidence/2026-11-23T10-34-33"
SHOT = b"\x89PNG\r\n\x1a\n" + b"0" * (150 * 1024)  # 150 KB
NOT_FOUND = b'{"error":"not found"}'
HEADERS = {
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'",
    "content-disposition": "inline",
    "cache-control": "private, no-cache",
}


def e2e_run(tmp_path: Path) -> Path:
    """TC-UI-115 of `alpha`: step 1 with a PNG screenshot, step 2 with one that is text."""
    folder = tmp_path / "alpha" / RUN / "tc-ui-115"
    folder.mkdir(parents=True)
    steps = [
        {"title": "Open", "status": "passed", "screenshot": "01.png", "error": None},
        {"title": "Save", "status": "failed", "screenshot": "02.png", "error": "x"},
    ]
    (folder / "result.json").write_text(json.dumps({"status": "failed", "steps": steps}))
    (folder / "01.png").write_bytes(SHOT)
    (folder / "02.png").write_text("not an image")
    return folder


def client_of(tmp_path: Path) -> TestClient:
    return make(tmp_path, FakeGinQa({EXPORT: export(case("TC-UI-115", run=RUN))}))


def not_found(client: TestClient, path: str, query: str = "") -> bool:
    """The one 404 answer, which says nothing about why."""
    res = client.get(f"/api/qa/cases/{path}/screenshot{query}")
    plain: bool = res.headers["content-type"] == "application/json"
    return res.status_code == 404 and res.content == NOT_FOUND and plain


# REQ-QA-006: Served
def test_qa_006_served(tmp_path: Path) -> None:
    e2e_run(tmp_path)
    res = client_of(tmp_path).get("/api/qa/cases/alpha/TC-UI-115/run/steps/1/screenshot")
    assert res.status_code == 200 and res.content == SHOT
    assert res.headers["content-type"] == "image/png"
    assert {key: res.headers[key] for key in HEADERS} == HEADERS


# REQ-QA-006: Not served
def test_qa_006_not_served(tmp_path: Path) -> None:
    e2e_run(tmp_path)
    client = client_of(tmp_path)
    for path in (
        "alpha/TC-UI-115/run/steps/2",  # text named .png
        "alpha/TC-UI-115/run/steps/3",  # a run of two steps
        "alpha/TC-UI-115/run/steps/0",
        "alpha/TC-UI-999/run/steps/1",  # no such case
        "nope/TC-UI-115/run/steps/1",  # no such project
        "gone/TC-UI-115/run/steps/1",  # its directory is missing
        "alpha/TC-UI-115/run/steps/1000",
        "alpha/TC-UI-115/run/steps/one",
        "alpha/TC-UI-115/run/steps/-1",
    ):
        assert not_found(client, path), path


# REQ-QA-006: Not served: a file deleted after the detail was read is checked again
def test_qa_006_deleted_after_the_detail(tmp_path: Path) -> None:
    folder = e2e_run(tmp_path)
    client = client_of(tmp_path)
    steps = client.get("/api/qa/cases/alpha/TC-UI-115").json()["latest_run"]["steps"]
    assert [s["screenshot"] for s in steps] == [True, False]
    (folder / "01.png").unlink()
    assert not_found(client, "alpha/TC-UI-115/run/steps/1")


# REQ-QA-006: Not served while gin-qa fails, with the same body
def test_qa_006_gin_qa_fails(tmp_path: Path) -> None:
    e2e_run(tmp_path)
    client = make(tmp_path, FakeGinQa({EXPORT: QaError("gin-qa timed out")}))
    assert not_found(client, "alpha/TC-UI-115/run/steps/1")


# REQ-QA-006: the case's run is found again, never taken from the client
def test_qa_006_no_path_from_the_client(tmp_path: Path) -> None:
    e2e_run(tmp_path)
    refused = export(case("TC-UI-115", run="../alpha/" + RUN))
    client = make(tmp_path, FakeGinQa({EXPORT: refused}))
    assert not_found(client, "alpha/TC-UI-115/run/steps/1")
    assert not_found(client, "alpha/TC-UI-115/run/steps/1", f"?run={RUN}&path=01.png")
