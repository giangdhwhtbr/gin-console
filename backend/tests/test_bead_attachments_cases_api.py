"""API cases of the Shared bead attachments change: which attachments of a bead are available
(REQ-BEADS-031), the attachment route (REQ-BEADS-032), the fetch of the shared store
(REQ-BEADS-033), its git commands (REQ-BEADS-035) and the attachments in the images of a bead
(REQ-BEADS-002, 026, 027, 028), over real export files, real image files in `tmp_path` and
recording fakes for git and bd."""

import hashlib
import json
import logging
import os
import sys
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import bead, write_export
from fake_git import FakeGit
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.attachments import REFS, GitError, GitRun, GitRunner, blob_path
from gin_console.beads.pull import FETCH_ARGS, BdRunner, PullRun, PullScheduler, PullService
from gin_console.beads.source import read_export
from gin_console.config import ProjectEntry, Settings

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 300_000  # 300 KB
TEXT = b"just some text, not a picture"
A = hashlib.sha256(PNG).hexdigest()
B = hashlib.sha256(PNG + b"B").hexdigest()
C = hashlib.sha256(PNG + b"C").hexdigest()
NOT_FOUND = b'{"error":"not found"}'
HEADERS = {
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'",
    "content-disposition": "inline",
    "cache-control": "private, max-age=31536000, immutable",
}
HOST, SHARED = REFS  # refs/gin/attachments, then refs/gin-console/attachments
PRUNED_AT = "2026-11-20T10:00:00Z"
NOW = datetime(2026, 11, 19, 4, 0, tzinfo=UTC)
CONFLICT = (
    "Error: merge origin/main: Error 1105: Merge conflict detected, "
    "@autocommit transaction rolled back."
)
needs_symlinks = pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges")


def attached(*items: Any) -> dict[str, Any]:
    """The `metadata` of a bead with these entries, as bd exports it: the list as JSON text."""
    return {"metadata": {"attachments": json.dumps(list(items))}}


def serve(
    tmp_path: Path,
    git: GitRunner,
    projects: dict[str, list[Any]],
    bd: BdRunner | None = None,
    **pull: bool,
) -> TestClient:
    """The projects named in `projects`, each with these export rows (`pull` maps a name to its
    `pull` setting)."""
    entries = []
    for name, rows in projects.items():
        write_export(tmp_path / name, rows)
        entries.append(ProjectEntry(name=name, path=tmp_path / name, pull=pull.get(name, True)))
    (tmp_path / "dist").mkdir(exist_ok=True)
    app = create_app(
        Settings(projects=entries),
        static_dir=tmp_path / "dist",
        read_beads=read_export,
        run_bd=bd or FakeBd(),
        run_git=git,
        clock=lambda: NOW,
    )
    return TestClient(app, raise_server_exceptions=False)


def shared(git: FakeGit, cwd: Path, blobs: dict[str, bytes], ref: str = SHARED) -> None:
    """`ref` of `cwd` holds `blobs`, each under its sha256."""
    git.listing(cwd, ref, [blob_path(sha) for sha in blobs])
    for sha, data in blobs.items():
        git.blob(cwd, ref, sha, data)


def images_of(api: TestClient, project: str, ident: str) -> dict[str, dict[str, Any]]:
    """The `images` of a bead by `sha256`."""
    images = api.get(f"/api/beads/{project}/{ident}").json()["images"]
    return {i["sha256"]: i for i in images}


def assert_not_found(response: Any) -> None:
    assert response.status_code == 404
    assert response.content == NOT_FOUND


def ls_tree(ref: str) -> tuple[str, ...]:
    return ("ls-tree", "-r", "--name-only", ref)


def fetch_of(api: TestClient, name: str) -> dict[str, Any] | None:
    found = {p["name"]: p for p in api.get("/api/projects/beads").json()}
    result: dict[str, Any] | None = found[name]["attachments_fetch"]
    return result


def put(path: Path, content: bytes = PNG) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


# REQ-BEADS-031 (Blob in the shared store), (Blob added on this host)
# TC: TC-BEADS-104@ebcf6a3d
def test_tc_beads_104_attachment_available_from_either_ref(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    shared(git, tmp_path / "alpha", {B: PNG + b"B"}, ref=HOST)
    rows = [
        bead("a-1", **attached({"sha256": A, "store": "git-ref"})),
        bead("a-2", **attached({"sha256": B})),
    ]
    api = serve(tmp_path, git, {"alpha": rows})
    for ident, sha in (("a-1", A), ("a-2", B)):
        image = images_of(api, "alpha", ident)[sha]
        assert image["available"] is True
        assert image["served_as"] == "attachment"
        assert image["reason"] is None


# REQ-BEADS-031 (Reasons)
# TC: TC-BEADS-105@103cb1f3
def test_tc_beads_105_reasons_an_attachment_is_not_available(tmp_path: Path) -> None:
    git = FakeGit()
    for ref in REFS:
        git.listing(tmp_path / "alpha", ref, [])
    items = [
        {"sha256": A, "store": "git-ref", "pruned_at": PRUNED_AT},
        {"sha256": B, "store": "s3"},
    ]
    row = bead("a-1", description=f"![c](attachment:{C})", **attached(*items))
    api = serve(tmp_path, git, {"alpha": [row]})
    images = images_of(api, "alpha", "a-1")
    assert {sha: images[sha]["reason"] for sha in (C, A, B)} == {
        C: "not_listed",
        A: "pruned",
        B: "unsupported_store",
    }
    assert all(images[sha]["available"] is False for sha in (A, B, C))
    assert all(images[sha]["served_as"] is None for sha in (A, B, C))


# REQ-BEADS-031 (Not fetched yet)
# TC: TC-BEADS-106@6cc5c625
def test_tc_beads_106_attachment_not_fetched_yet(tmp_path: Path) -> None:
    api = serve(
        tmp_path, FakeGit(), {"alpha": [bead("a-1", **attached({"sha256": A, "store": "git-ref"}))]}
    )
    image = images_of(api, "alpha", "a-1")[A]
    assert (image["available"], image["reason"], image["served_as"]) == (False, "not_fetched", None)


# REQ-BEADS-031 (Local store)
# TC: TC-BEADS-107@5d2190e2
@needs_symlinks
def test_tc_beads_107_attachment_of_the_local_store(tmp_path: Path) -> None:
    store = tmp_path / "alpha/.agent-workflow/attachments"
    put(store / A[:2] / A)
    os.symlink(put(tmp_path / "outside.png"), _prepared(store / B[:2] / B))
    items = [{"sha256": A, "store": "local"}, {"sha256": B, "store": "local"}]
    api = serve(tmp_path, FakeGit(), {"alpha": [bead("a-1", **attached(*items))]})
    images = images_of(api, "alpha", "a-1")
    assert (images[A]["available"], images[A]["served_as"]) == (True, "attachment")
    assert (images[B]["available"], images[B]["reason"]) == (False, "not_fetched")


def _prepared(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


# REQ-BEADS-031 (No git without shared entries)
# TC: TC-BEADS-108@6c9aa7d2
def test_tc_beads_108_no_git_without_shared_entries(tmp_path: Path) -> None:
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
# TC: TC-BEADS-109@b2c5b997
def test_tc_beads_109_one_listing_per_snapshot(tmp_path: Path) -> None:
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


# REQ-BEADS-032 (Served)
# TC: TC-BEADS-110@f4e0c3cc
def test_tc_beads_110_attachment_served(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached({"sha256": A}))]})
    response = api.get(f"/api/beads/alpha/a-1/attachments/{A}")
    assert response.status_code == 200
    assert response.content == PNG
    assert response.headers["content-type"] == "image/png"
    assert {k: response.headers[k] for k in HEADERS} == HEADERS


# REQ-BEADS-032 (Bytes refused)
# TC: TC-BEADS-111@0460e8da
def test_tc_beads_111_attachment_bytes_refused(tmp_path: Path) -> None:
    big = PNG + b"0" * (11 * 1024 * 1024 - len(PNG))  # 11 MB
    text_sha, big_sha = hashlib.sha256(TEXT).hexdigest(), hashlib.sha256(big).hexdigest()
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG + b"not A", text_sha: TEXT, big_sha: big})
    items = [{"sha256": sha} for sha in (A, text_sha, big_sha)]
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached(*items))]})
    for sha in (A, text_sha, big_sha):
        assert_not_found(api.get(f"/api/beads/alpha/a-1/attachments/{sha}"))


# REQ-BEADS-032 (Not served)
# TC: TC-BEADS-112@d3a14d63
def test_tc_beads_112_attachment_not_served(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG, B: PNG + b"B"})
    rows = [
        bead("a-1", **attached({"sha256": A, "pruned_at": PRUNED_AT})),
        bead("a-2", **attached({"sha256": B})),
    ]
    api = serve(tmp_path, git, {"alpha": rows})
    assert api.get(f"/api/beads/alpha/a-2/attachments/{B}").status_code == 200
    for url in (
        f"/api/beads/alpha/a-1/attachments/{A}",
        f"/api/beads/alpha/a-1/attachments/{B}",
        "/api/beads/alpha/a-1/attachments/ab12",
        f"/api/beads/alpha/a-2/attachments/{B.upper()}",
        f"/api/beads/alpha/a-9/attachments/{B}",
    ):
        assert_not_found(api.get(url))


# REQ-BEADS-033 (Fetch after the pull)
# TC: TC-BEADS-113@2c88e730
def test_tc_beads_113_fetch_after_the_pull(tmp_path: Path) -> None:
    order: list[str] = []
    bd, git = FakeBd({tmp_path / "A": PullRun(1, CONFLICT)}), FakeGit()
    git.answers[(tmp_path / "A", FETCH_ARGS)] = GitRun(0, b"", "")

    def run_bd(cwd: Path) -> PullRun:
        order.append("bd")
        return bd(cwd)

    api = serve(tmp_path, _Ordered(git, order), {"A": []}, bd=run_bd)
    assert api.post("/api/refresh").status_code == 204
    assert order == ["bd", "git"]
    assert git.calls == [(tmp_path / "A", FETCH_ARGS)]
    assert FETCH_ARGS[-1] == "+refs/gin/attachments:refs/gin-console/attachments"
    body = {p["name"]: p for p in api.get("/api/projects/beads").json()}["A"]
    assert body["pull"]["status"] == "error"
    assert body["attachments_fetch"]["status"] == "ok"


class _Ordered:
    """A git runner that notes each call in `order`, then answers as `git`."""

    def __init__(self, git: FakeGit, order: list[str]) -> None:
        self.git, self.order = git, order

    def __call__(self, args: Sequence[str], cwd: Path) -> GitRun:
        self.order.append("git")
        return self.git(args, cwd)


# REQ-BEADS-033 (No store, no remote)
# TC: TC-BEADS-114@f8d6e516
def test_tc_beads_114_no_store_and_no_remote(tmp_path: Path) -> None:
    git = FakeGit(
        {
            (tmp_path / "A", FETCH_ARGS): GitRun(
                128, b"", "fatal: couldn't find remote ref refs/gin/attachments"
            ),
            (tmp_path / "B", FETCH_ARGS): GitRun(
                128, b"", "fatal: 'origin' does not appear to be a git repository"
            ),
        }
    )
    api = serve(tmp_path, git, {"A": [], "B": []})
    assert api.post("/api/refresh").status_code == 204
    fetched = (fetch_of(api, "A"), fetch_of(api, "B"))
    assert [(f["status"], f["error"]) for f in fetched if f] == [
        ("no_store", None),
        ("no_remote", None),
    ]


# REQ-BEADS-033 (Failure and timeout)
# TC: TC-BEADS-115@5be1269b
def test_tc_beads_115_fetch_failure_and_timeout(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    for name in ("A", "B"):
        (tmp_path / name).mkdir()
    git = FakeGit(
        {
            (tmp_path / "A", FETCH_ARGS): GitRun(
                128, b"", "fatal: Could not read from remote repository."
            ),
            (tmp_path / "B", FETCH_ARGS): GitError("git timed out"),
        }
    )
    entries = [ProjectEntry(name=n, path=tmp_path / n) for n in ("A", "B")]
    pulls = PullService(entries, FakeBd(), lambda: NOW, git)
    with caplog.at_level(logging.WARNING, logger="gin_console.beads.pull"):
        PullScheduler(pulls, 300, after=lambda: None).run_once()
    first, second = pulls.fetch_result("A"), pulls.fetch_result("B")
    assert first is not None and second is not None
    assert (first.status, first.error) == ("error", "fatal: Could not read from remote repository.")
    assert (second.status, second.error) == ("error", "git fetch timed out")
    messages = sorted(r.getMessage() for r in caplog.records)
    assert messages == [
        "attachment fetch of A failed: fatal: Could not read from remote repository.",
        "attachment fetch of B failed: git fetch timed out",
    ]


# REQ-BEADS-033 (Opted out)
# TC: TC-BEADS-116@5498c43d
def test_tc_beads_116_fetch_of_an_opted_out_project(tmp_path: Path) -> None:
    git = FakeGit()
    api = serve(tmp_path, git, {"A": []}, A=False)
    assert api.post("/api/refresh").status_code == 204
    assert git.calls == []
    assert fetch_of(api, "A") is None


# REQ-BEADS-035 (Only the allowed commands)
# TC: TC-BEADS-120@5e6b8221
def test_tc_beads_120_only_the_allowed_git_commands(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    items = [{"sha256": A}, {"sha256": B, "store": "git-ref"}]
    api = serve(tmp_path, git, {"alpha": [bead("a-1", **attached(*items))]})
    assert api.post("/api/refresh").status_code == 204
    assert api.get("/api/beads", params={"project": "alpha"}).status_code == 200
    assert api.get("/api/beads/alpha/a-1").status_code == 200
    assert api.get(f"/api/beads/alpha/a-1/attachments/{A}").status_code == 200
    allowed = (
        {FETCH_ARGS}
        | {ls_tree(ref) for ref in REFS}
        | {("cat-file", mode, f"{ref}:{blob_path(A)}") for ref in REFS for mode in ("-s", "blob")}
    )
    assert git.calls
    for cwd, args in git.calls:
        assert cwd == tmp_path / "alpha" and args in allowed, args
        assert not {"push", "update-ref", "refs/gin/attachments-origin"} & set(args)


# REQ-BEADS-026 (Entries the text does not name)
# TC: TC-BEADS-121@f5ecc3a3
def test_tc_beads_121_attachments_the_text_does_not_name(tmp_path: Path) -> None:
    items = [{"sha256": B, "caption": "Step 2"}, {"sha256": A}, {"sha256": "x"}, "oops"]
    row = bead(
        "b-1",
        issue_type="bug",
        description=f"![Step 1](attachment:{A})\nshots/c.png\n",
        **attached(*items),
    )
    api = serve(tmp_path, FakeGit(), {"alpha": [row]})
    images = api.get("/api/beads/alpha/b-1").json()["images"]
    assert [(i["n"], i["sha256"], i["path"], i["caption"]) for i in images] == [
        (1, A, None, "Step 1"),
        (2, None, "shots/c.png", "c.png"),
        (3, B, None, "Step 2"),
    ]


# REQ-BEADS-026 (Bad attachment addresses)
# TC: TC-BEADS-122@ff625c35
def test_tc_beads_122_bad_attachment_addresses(tmp_path: Path) -> None:
    row = bead("b-1", description="![key](attachment:ab12)", metadata={"attachments": "none"})
    api = serve(tmp_path, FakeGit(), {"alpha": [row]})
    assert api.get("/api/beads/alpha/b-1").json()["images"] == []


# REQ-BEADS-026 (Attachment named twice)
# TC: TC-BEADS-123@cd4a9e43
def test_tc_beads_123_attachment_named_twice(tmp_path: Path) -> None:
    row = bead(
        "b-1", description=f"![First](attachment:{A})", notes=f"[again](attachment:{A.upper()})"
    )
    api = serve(tmp_path, FakeGit(), {"alpha": [row]})
    images = api.get("/api/beads/alpha/b-1").json()["images"]
    assert [(i["sha256"], i["caption"]) for i in images] == [(A, "First")]


# REQ-BEADS-027 (Attachment first, file as fallback)
# TC: TC-BEADS-124@6510e279
def test_tc_beads_124_attachment_first_file_as_fallback(tmp_path: Path) -> None:
    put(tmp_path / "alpha/qa/evidence/r1/01.png")
    put(tmp_path / "alpha/qa/evidence/r1/02.png")
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    description = (
        f"![One](attachment:{A})\n  local: qa/evidence/r1/01.png\n"
        f"![Two](attachment:{B})\n  local: qa/evidence/r1/02.png\n"
    )
    items = [{"sha256": A, "store": "git-ref"}, {"sha256": B, "store": "git-ref"}]
    row = bead("a-1", issue_type="bug", description=description, **attached(*items))
    api = serve(tmp_path, git, {"alpha": [row]})
    images = api.get("/api/beads/alpha/a-1").json()["images"]
    assert [(i["available"], i["served_as"]) for i in images] == [
        (True, "attachment"),
        (True, "file"),
    ]


# REQ-BEADS-028 (Attachment without a file)
# TC: TC-BEADS-125@726cf2b2
def test_tc_beads_125_attachment_without_a_file(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    row = bead("a-1", description=f"![One](attachment:{A})", **attached({"sha256": A}))
    api = serve(tmp_path, git, {"alpha": [row]})
    image = api.get("/api/beads/alpha/a-1").json()["images"][0]
    assert (image["available"], image["path"]) == (True, None)
    assert_not_found(api.get("/api/beads/alpha/a-1/images/1"))


# REQ-BEADS-002 (Attachment images)
# TC: TC-BEADS-126@c5b7ac8a
def test_tc_beads_126_attachment_images_of_the_detail(tmp_path: Path) -> None:
    git = FakeGit()
    shared(git, tmp_path / "alpha", {A: PNG})
    items = [{"sha256": A}, {"sha256": B, "name": "02.png", "pruned_at": PRUNED_AT}]
    row = bead(
        "b-1", issue_type="bug", description=f"![Step 1](attachment:{A})", **attached(*items)
    )
    api = serve(tmp_path, git, {"alpha": [row]})
    assert api.get("/api/beads/alpha/b-1").json()["images"] == [
        {
            "n": 1,
            "path": None,
            "sha256": A,
            "caption": "Step 1",
            "available": True,
            "served_as": "attachment",
            "reason": None,
        },
        {
            "n": 2,
            "path": None,
            "sha256": B,
            "caption": "02.png",
            "available": False,
            "served_as": None,
            "reason": "pruned",
        },
    ]
