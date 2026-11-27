"""`GET /api/beads/{project}/{id}/images/{n}` (REQ-BEADS-028) and the image fields of the list and
the detail, over real export files."""

from pathlib import Path

import pytest
from fake_bd import FakeBd
from fake_export import bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.source import read_export
from gin_console.config import ProjectEntry, Settings

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100
NOT_FOUND = b'{"error":"not found"}'
HEADERS = {
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'",
    "content-disposition": "inline",
    "cache-control": "private, no-cache",
}


def put(path: Path, content: bytes = PNG) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def make(tmp_path: Path) -> TestClient:
    """Project `alpha`, whose `a-1` names an available PNG, a file outside every folder and a
    missing file; project `q`, whose `q-1` names a JPEG of its evidence folder `att`."""
    alpha, q, att = tmp_path / "alpha", tmp_path / "q", tmp_path / "att"
    put(alpha / "qa/evidence/r1/01.png")
    outside = put(tmp_path / "x.png")
    put(att / "BUG-5.jpg", JPEG)
    write_export(
        alpha,
        [
            bead(
                "a-1",
                issue_type="bug",
                description=f"![Step 1](qa/evidence/r1/01.png)\n{outside.as_posix()}\ngone.png",
            ),
            bead("a-2", description=f"{(att / 'BUG-5.jpg').as_posix()}"),
        ],
    )
    write_export(
        q, [bead("q-1", description=f"[BUG-5.jpg](file://{(att / 'BUG-5.jpg').as_posix()})")]
    )
    (tmp_path / "dist").mkdir()
    settings = Settings(
        projects=[
            ProjectEntry(name="alpha", path=alpha),
            ProjectEntry(name="q", path=q, evidence_roots=[att, tmp_path / "no-such-folder"]),
            ProjectEntry(name="gone", path=tmp_path / "gone"),
        ]
    )
    app = create_app(
        settings, static_dir=tmp_path / "dist", read_beads=read_export, run_bd=FakeBd()
    )
    return TestClient(app, raise_server_exceptions=False)


# REQ-BEADS-028 (Served)
def test_beads_028_served_with_the_four_headers(tmp_path: Path) -> None:
    response = make(tmp_path).get("/api/beads/alpha/a-1/images/1")
    assert response.status_code == 200
    assert response.content == PNG
    assert response.headers["content-type"] == "image/png"
    assert {k: response.headers[k] for k in HEADERS} == HEADERS


# REQ-BEADS-028 (Served), REQ-BEADS-027 (Listed folder): an evidence folder serves its project
def test_beads_028_served_from_an_evidence_folder(tmp_path: Path) -> None:
    api = make(tmp_path)
    response = api.get("/api/beads/q/q-1/images/1")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == JPEG
    assert api.get("/api/beads/alpha/a-2/images/1").content == NOT_FOUND


# REQ-BEADS-028 (Not served): every failure answers the same 404
@pytest.mark.parametrize(
    "url",
    [
        "/api/beads/alpha/a-1/images/2",  # outside the allowed folders
        "/api/beads/alpha/a-1/images/3",  # missing
        "/api/beads/alpha/a-1/images/4",  # past the end
        "/api/beads/alpha/a-1/images/0",
        "/api/beads/alpha/a-1/images/-1",
        "/api/beads/alpha/a-1/images/x",
        "/api/beads/alpha/a-1/images/1.0",
        "/api/beads/alpha/a-1/images/99999999999999999999999",
        "/api/beads/alpha/a-9/images/1",  # no such bead
        "/api/beads/alpha/a-2/images/1",  # an evidence folder of another project
        "/api/beads/nope/a-1/images/1",  # no such project
        "/api/beads/gone/a-1/images/1",  # its directory does not exist
    ],
)
def test_beads_028_not_served(tmp_path: Path, url: str) -> None:
    response = make(tmp_path).get(url)
    assert response.status_code == 404
    assert response.content == NOT_FOUND
    assert response.headers["content-type"] == "application/json"


# REQ-BEADS-028: the client never sends a path; such a URL matches no route
def test_beads_028_no_path_from_the_client(tmp_path: Path) -> None:
    api = make(tmp_path)
    for url in (
        "/api/beads/alpha/a-1/images/qa/evidence/r1/01.png",
        "/api/beads/alpha/a-1/images?path=qa/evidence/r1/01.png",
        "/api/beads/alpha/a-1/images/1/../../x.png",
        "/api/beads/alpha/..%2Fa-1/images/1",
    ):
        assert api.get(url).status_code == 404, url


# REQ-BEADS-028 (Removed after the snapshot)
def test_beads_028_removed_after_the_snapshot(tmp_path: Path) -> None:
    api = make(tmp_path)
    assert api.get("/api/beads/alpha/a-1/images/1").status_code == 200
    (tmp_path / "alpha/qa/evidence/r1/01.png").unlink()
    response = api.get("/api/beads/alpha/a-1/images/1")
    assert response.status_code == 404 and response.content == NOT_FOUND


# REQ-BEADS-028: a file changed after the snapshot into something that is no image
def test_beads_028_changed_after_the_snapshot(tmp_path: Path) -> None:
    api = make(tmp_path)
    assert api.get("/api/beads/alpha/a-1/images/1").status_code == 200
    (tmp_path / "alpha/qa/evidence/r1/01.png").write_text("<svg/>")
    assert api.get("/api/beads/alpha/a-1/images/1").content == NOT_FOUND


# REQ-BEADS-001 (Image count), REQ-BEADS-002 (Images) over the real export
def test_beads_001_002_image_fields(tmp_path: Path) -> None:
    api = make(tmp_path)
    rows = {b["id"]: b for b in api.get("/api/beads", params={"project": "alpha"}).json()}
    assert (rows["a-1"]["image_count"], rows["a-2"]["image_count"]) == (1, 0)
    detail = api.get("/api/beads/alpha/a-1").json()
    assert [(i["n"], i["caption"], i["available"]) for i in detail["images"]] == [
        (1, "Step 1", True),
        (2, "x.png", False),
        (3, "gone.png", False),
    ]
    assert api.get("/api/beads/q/q-1").json()["images"][0]["available"] is True
