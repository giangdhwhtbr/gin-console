import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fake_export import FakeExport, bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import BeadsError, read_export
from gin_console.config import ProjectEntry, Settings


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 10, 20, 3, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


def make(tmp_path: Path, fake: Any = None) -> TestClient:
    """An app over project `proj` whose rows come from `fake`; `proj` has an export file so the
    snapshot is kept until that file changes. Without `fake`, the real reader reads that file."""
    (tmp_path / "proj").mkdir(exist_ok=True)
    (tmp_path / "dist").mkdir(exist_ok=True)
    if fake is not None:
        write_export(tmp_path / "proj", [])
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
        read_beads=read_export if fake is None else fake,
        clock=Clock(),
    )
    return TestClient(app, raise_server_exceptions=False)


def touch_export(tmp_path: Path, at: int) -> None:
    """Give proj's export file a new modification time, as a bd write does."""
    os.utime(tmp_path / "proj" / ".beads" / "issues.jsonl", ns=(at, at))


CLOSED = [bead(f"c-{n}", status="closed") for n in range(2)]
LARGE = [bead(f"a-{n}", title="x" * 60) for n in range(30)]
LIST = {"project": "proj", "closed": "1"}


def etag_of(api: TestClient) -> str:
    return str(api.get("/api/beads", params={"project": "proj"}).headers["etag"])


# REQ-SERVER-011
def test_server_011_large_answer_is_gzipped(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(LARGE))
    r = api.get("/api/beads", params=LIST, headers={"Accept-Encoding": "gzip"})
    plain = api.get("/api/beads", params=LIST, headers={"Accept-Encoding": "identity"})
    assert r.headers["content-encoding"] == "gzip"
    assert r.json() == plain.json()


# REQ-SERVER-011
def test_server_011_small_answer_is_not_gzipped(tmp_path: Path) -> None:
    r = make(tmp_path, FakeExport()).get("/api/health", headers={"Accept-Encoding": "gzip"})
    assert "content-encoding" not in r.headers


# REQ-SERVER-011
def test_server_011_client_without_gzip(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(LARGE))
    r = api.get("/api/beads", params=LIST, headers={"Accept-Encoding": "identity"})
    assert "content-encoding" not in r.headers


# REQ-BEADS-014
def test_beads_014_same_list_same_etag(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(LARGE))
    one = api.get("/api/beads", params={"project": "proj"})
    two = api.get("/api/beads", params={"project": "proj"})
    assert one.status_code == two.status_code == 200
    assert one.headers["etag"] == two.headers["etag"]
    assert one.headers["etag"].startswith('W/"')
    assert one.headers["cache-control"] == "no-cache"


# REQ-BEADS-014
def test_beads_014_not_modified(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(LARGE))
    tag = etag_of(api)
    for header in (tag, tag.removeprefix("W/"), f'"zzz", {tag}', "*"):
        r = api.get("/api/beads", params={"project": "proj"}, headers={"If-None-Match": header})
        assert r.status_code == 304, header
        assert r.headers["etag"] == tag
        assert r.content == b""


# REQ-BEADS-014
def test_beads_014_changed_list(tmp_path: Path) -> None:
    fake = FakeExport(LARGE)
    api = make(tmp_path, fake)
    tag = etag_of(api)
    fake.beads[0] = {**fake.beads[0], "title": "renamed"}
    touch_export(tmp_path, 2_000_000_000)
    r = api.get("/api/beads", params={"project": "proj"}, headers={"If-None-Match": tag})
    assert r.status_code == 200
    assert r.headers["etag"] != tag


# REQ-BEADS-014
def test_beads_014_show_closed(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(LARGE + CLOSED))
    closed = api.get("/api/beads", params=LIST)
    assert closed.headers["etag"] != etag_of(api)


# REQ-BEADS-014
def test_beads_014_failure_has_no_etag(tmp_path: Path) -> None:
    api = make(tmp_path, FakeExport(failure=BeadsError("boom")))
    r = api.get("/api/beads", params={"project": "proj"}, headers={"If-None-Match": '"x"'})
    assert r.status_code == 502
    assert r.json() == {"error": "boom"}
    assert "etag" not in r.headers
    missing = api.get("/api/beads", params={"project": "nope"})
    assert missing.status_code == 404
    assert "etag" not in missing.headers
