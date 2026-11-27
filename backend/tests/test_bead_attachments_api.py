"""`GET /api/beads/{project}/{id}/attachments/{sha256}` (REQ-BEADS-032), and the git commands
behind it and behind the bead pages (REQ-BEADS-031, REQ-BEADS-035), over real export files and a
recording git runner; no test starts git."""

import hashlib
import json
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import bead, write_export
from fake_git import FakeGit
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.attachments import REFS, blob_path
from gin_console.beads.source import read_export
from gin_console.config import ProjectEntry, Settings

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 300_000  # 300 KB
TEXT = b"just some text, not a picture"
A = hashlib.sha256(PNG).hexdigest()
B = hashlib.sha256(PNG + b"B").hexdigest()
NOT_FOUND = b'{"error":"not found"}'
HEADERS = {
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'",
    "content-disposition": "inline",
    "cache-control": "private, max-age=31536000, immutable",
}
HOST, SHARED = REFS  # refs/gin/attachments, then refs/gin-console/attachments
PRUNED_AT = "2026-11-20T10:00:00Z"


def attached(*items: Any) -> dict[str, Any]:
    """The `metadata` of a bead with these entries, as bd exports it: the list as JSON text."""
    return {"metadata": {"attachments": json.dumps(list(items))}}


def serve(tmp_path: Path, git: FakeGit, projects: dict[str, list[Any]]) -> TestClient:
    """The projects named in `projects`, each with these export rows, and project `gone`, whose
    directory does not exist."""
    entries = [ProjectEntry(name="gone", path=tmp_path / "gone")]
    for name, rows in projects.items():
        write_export(tmp_path / name, rows)
        entries.append(ProjectEntry(name=name, path=tmp_path / name))
    (tmp_path / "dist").mkdir(exist_ok=True)
    app = create_app(
        Settings(projects=entries),
        static_dir=tmp_path / "dist",
        read_beads=read_export,
        run_bd=FakeBd(),
        run_git=git,
    )
    return TestClient(app, raise_server_exceptions=False)


def shared(git: FakeGit, cwd: Path, blobs: dict[str, bytes]) -> None:
    """`refs/gin-console/attachments` of `cwd` holds `blobs`, each under its sha256."""
    git.listing(cwd, SHARED, [blob_path(sha) for sha in blobs])
    for sha, data in blobs.items():
        git.blob(cwd, SHARED, sha, data)


def assert_not_found(response: Any) -> None:
    assert response.status_code == 404
    assert response.content == NOT_FOUND
    assert response.headers["content-type"] == "application/json"


def ls_tree(ref: str) -> tuple[str, ...]:
    return ("ls-tree", "-r", "--name-only", ref)


# REQ-BEADS-032 (Served)
def test_beads_032_served(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached({"sha256": A}))]})
    response = api.get(f"/api/beads/alpha/a-1/attachments/{A}")
    assert response.status_code == 200
    assert response.content == PNG
    assert response.headers["content-type"] == "image/png"
    assert {k: response.headers[k] for k in HEADERS} == HEADERS


# REQ-BEADS-032 (Bytes refused)
def test_beads_032_bytes_refused(tmp_path: Path) -> None:
    big = PNG + b"0" * (11 * 1024 * 1024 - len(PNG))  # 11 MB
    blob_b, blob_c = hashlib.sha256(TEXT).hexdigest(), hashlib.sha256(big).hexdigest()
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG + b"not A", blob_b: TEXT, blob_c: big})
    items = [{"sha256": sha} for sha in (A, blob_b, blob_c)]
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached(*items))]})
    for sha in (A, blob_b, blob_c):
        assert_not_found(api.get(f"/api/beads/alpha/a-1/attachments/{sha}"))
    assert (tmp_path / "alpha", ("cat-file", "blob", f"{SHARED}:{blob_path(blob_c)}")) not in (
        git.calls
    )


# REQ-BEADS-032 (Not served): every failure answers the same 404
@pytest.mark.parametrize(
    "url",
    [
        f"/api/beads/alpha/a-1/attachments/{A}",  # pruned
        f"/api/beads/alpha/a-1/attachments/{B}",  # an attachment of another bead
        "/api/beads/alpha/a-1/attachments/ab12",
        f"/api/beads/alpha/a-2/attachments/{B.upper()}",
        f"/api/beads/alpha/a-2/attachments/{B}0",
        f"/api/beads/alpha/a-9/attachments/{B}",  # no such bead
        f"/api/beads/alpha/-a-2/attachments/{B}",  # no valid bead id
        f"/api/beads/nope/a-2/attachments/{B}",  # no such project
        f"/api/beads/gone/a-2/attachments/{B}",  # its directory does not exist
    ],
)
def test_beads_032_not_served(tmp_path: Path, url: str) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG, B: PNG + b"B"})
    rows = [
        bead("a-1", **attached({"sha256": A, "pruned_at": PRUNED_AT})),
        bead("a-2", **attached({"sha256": B})),
    ]
    api = serve(tmp_path, git, {"alpha": rows})
    assert api.get(f"/api/beads/alpha/a-2/attachments/{B}").status_code == 200
    assert_not_found(api.get(url))


# REQ-BEADS-032: the client never sends a path; such a URL matches no route
def test_beads_032_no_path_from_the_client(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached({"sha256": A}))]})
    for url in (
        f"/api/beads/alpha/a-1/attachments/{A[:2]}/{A}",
        f"/api/beads/alpha/a-1/attachments/{A}/../../x.png",
        f"/api/beads/alpha/a-1/attachments?path={blob_path(A)}",
    ):
        assert api.get(url).status_code == 404, url


# REQ-BEADS-032: a blob gone since the listing is checked again and not served
def test_beads_032_blob_gone_since_the_listing(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached({"sha256": A}))]})
    assert api.get(f"/api/beads/alpha/a-1/attachments/{A}").status_code == 200
    del git.answers[(tmp_path / "alpha", ("cat-file", "-s", f"{SHARED}:{blob_path(A)}"))]
    assert_not_found(api.get(f"/api/beads/alpha/a-1/attachments/{A}"))


# REQ-BEADS-031 (No git without shared entries)
def test_beads_031_no_git_without_shared_entries(tmp_path: Path) -> None:
    git = FakeGit()
    rows = [
        bead("b-1", description=f"![x](attachment:{A})"),
        bead("b-2", **attached({"sha256": B, "store": "local"})),
    ]
    api = serve(tmp_path, git, {"beta": rows})
    assert api.get("/api/beads", params={"project": "beta"}).status_code == 200
    for ident in ("b-1", "b-2"):
        assert api.get(f"/api/beads/beta/{ident}").status_code == 200
    assert git.calls == []


# REQ-BEADS-031 (One listing per snapshot)
def test_beads_031_one_listing_per_snapshot(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    rows = [bead("a-1", **attached({"sha256": A})), bead("a-2", **attached({"sha256": B}))]
    api = serve(tmp_path, git, {"alpha": rows})
    for _ in range(2):
        assert api.get("/api/beads", params={"project": "alpha"}).status_code == 200
    for ident in ("a-1", "a-2"):
        assert api.get(f"/api/beads/alpha/{ident}").status_code == 200
    listings = [args for _, args in git.calls if args[0] == "ls-tree"]
    assert sorted(listings) == sorted(ls_tree(ref) for ref in REFS)


# REQ-BEADS-035 (Only the allowed commands), on the read side
def test_beads_035_only_the_allowed_commands(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    items = [{"sha256": A}, {"sha256": B, "store": "git-ref"}]
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached(*items))]})
    assert api.post("/api/refresh").status_code == 204
    assert api.get("/api/beads", params={"project": "alpha"}).status_code == 200
    assert api.get("/api/beads/alpha/a-1").status_code == 200
    assert api.get(f"/api/beads/alpha/a-1/attachments/{A}").status_code == 200
    allowed = {ls_tree(ref) for ref in REFS} | {
        ("cat-file", mode, f"{ref}:{blob_path(A)}") for ref in REFS for mode in ("-s", "blob")
    }
    assert git.calls
    for cwd, args in git.calls:
        assert cwd == tmp_path / "alpha" and args in allowed, args
        assert not {"push", "update-ref", "refs/gin/attachments-origin"} & set(args)
