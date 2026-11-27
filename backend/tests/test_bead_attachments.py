"""The shared attachment store: which attachments of a bead are available (REQ-BEADS-031), the
bytes it serves (REQ-BEADS-032) and the git commands it runs (REQ-BEADS-035), over a recording
git runner; no test starts git."""

import hashlib
import json
import logging
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

import pytest
from fake_git import FakeGit

from gin_console.beads.attachments import (
    GIT_TIMEOUT_SECONDS,
    REFS,
    SHA256,
    AttachmentStore,
    Entry,
    GitError,
    GitRun,
    Reason,
    blob_path,
    entries,
    run_git,
    served,
)
from gin_console.beads.images import MAX_BYTES
from gin_console.beads.snapshot import Snapshot, build_snapshot
from gin_console.config import ProjectEntry

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100
TEXT = b"just some text, not a picture"
A = hashlib.sha256(PNG).hexdigest()
B = hashlib.sha256(b"B").hexdigest()
C = hashlib.sha256(b"C").hexdigest()
HOST, SHARED = REFS  # refs/gin/attachments, then refs/gin-console/attachments
needs_symlinks = pytest.mark.skipif(sys.platform == "win32", reason="symlinks need privileges")


def alpha(tmp_path: Path) -> ProjectEntry:
    entry = ProjectEntry(name="alpha", path=tmp_path / "alpha")
    entry.path.mkdir(exist_ok=True)
    return entry


def row(ident: str, *items: Any, description: str = "") -> dict[str, Any]:
    """A bead with these entries, as bd exports them: the list as JSON text."""
    metadata = {"attachments": json.dumps(list(items))}
    return {"id": ident, "description": description, "metadata": metadata}


def entry_of(snapshot: Snapshot, bead: str, sha: str) -> Entry | None:
    return next((e for e in entries(snapshot.rows[bead].get("metadata")) if e.sha256 == sha), None)


def check(
    store: AttachmentStore, project: ProjectEntry, snapshot: Snapshot, sha: str
) -> Reason | None:
    """The state of attachment `sha` of bead `a-1`, as the image index works it out."""
    return store.state(project, store.listing(project, snapshot), entry_of(snapshot, "a-1", sha))


def put(path: Path, content: bytes = PNG) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def local_file(project: ProjectEntry, sha: str) -> Path:
    return project.path / ".agent-workflow" / "attachments" / sha[:2] / sha


def link(path: Path, target: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.symlink_to(target)


def ls_tree(ref: str) -> tuple[str, ...]:
    return ("ls-tree", "-r", "--name-only", ref)


# REQ-BEADS-031 (Blob in the shared store)
def test_beads_031_blob_in_the_shared_store(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    git.listing(project.path, SHARED, [blob_path(A)])
    snapshot = build_snapshot([row("a-1", {"sha256": A, "store": "git-ref"})])
    assert check(AttachmentStore(git), project, snapshot, A) is None


# REQ-BEADS-031 (Blob added on this host)
def test_beads_031_blob_added_on_this_host(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    git.listing(project.path, HOST, [blob_path(A)])
    snapshot = build_snapshot([row("a-1", {"sha256": A})])
    assert check(AttachmentStore(git), project, snapshot, A) is None


# REQ-BEADS-031 (Reasons)
def test_beads_031_reasons(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    for ref in REFS:
        git.listing(project.path, ref, [])
    pruned = {"sha256": A, "store": "git-ref", "pruned_at": "2026-11-20T10:00:00Z"}
    snapshot = build_snapshot(
        [row("a-1", pruned, {"sha256": B, "store": "s3"}, description=f"![c](attachment:{C})")]
    )
    store = AttachmentStore(git)
    assert [check(store, project, snapshot, sha) for sha in (C, A, B)] == [
        "not_listed",
        "pruned",
        "unsupported_store",
    ]


# REQ-BEADS-031 (Reasons): a pruned entry of another store is pruned, checked before its store
def test_beads_031_pruned_before_the_store(tmp_path: Path) -> None:
    project = alpha(tmp_path)
    found = Entry(A, "s3", pruned=True, caption=None, name=None)
    assert AttachmentStore(FakeGit()).state(project, frozenset(), found) == "pruned"


# REQ-BEADS-031 (Not fetched yet)
def test_beads_031_not_fetched_yet(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()  # each ref answers 128, as a missing ref does
    snapshot = build_snapshot([row("a-1", {"sha256": A, "store": "git-ref"})])
    assert check(AttachmentStore(git), project, snapshot, A) == "not_fetched"
    assert [args for _, args in git.calls] == [ls_tree(HOST), ls_tree(SHARED)]


# REQ-BEADS-031 (Local store)
@needs_symlinks
def test_beads_031_local_store(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    put(local_file(project, A))
    outside = put(tmp_path / "B")
    link(local_file(project, B), outside)
    snapshot = build_snapshot(
        [row("a-1", {"sha256": A, "store": "local"}, {"sha256": B, "store": "local"})]
    )
    store = AttachmentStore(git)
    assert check(store, project, snapshot, A) is None
    assert check(store, project, snapshot, B) == "not_fetched"
    assert git.calls == []


# REQ-BEADS-031 (Local store): a folder, a missing file and a project folder that is gone
def test_beads_031_local_store_needs_a_regular_file(tmp_path: Path) -> None:
    project, store = alpha(tmp_path), AttachmentStore(FakeGit())
    local_file(project, A).mkdir(parents=True)
    for sha in (A, B):
        assert store.state(project, frozenset(), Entry(sha, "local", False, None, None)), sha
    gone = ProjectEntry(name="gone", path=tmp_path / "gone")
    assert store.state(gone, frozenset(), Entry(A, "local", False, None, None)) == "not_fetched"


# REQ-BEADS-031 (No git without shared entries)
def test_beads_031_no_git_without_shared_entries(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    store = AttachmentStore(git)
    for rows in (
        [{"id": "b-1"}, {"id": "b-2", "metadata": {"attachments": "none"}}, row("b-3")],
        [row("b-1", {"sha256": A, "store": "local"}), row("b-2", "oops", {"sha256": "x"})],
    ):
        assert store.listing(project, build_snapshot(rows)) == frozenset()
    assert git.calls == []


# REQ-BEADS-031 (One listing per snapshot): `ls-tree` once per ref for a snapshot object, again
# for a new one, and the blobs of both refs together
def test_beads_031_one_listing_per_snapshot(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    git.listing(project.path, HOST, [blob_path(A)])
    git.listing(project.path, SHARED, [blob_path(B), blob_path(A)])
    rows = [row("a-1", {"sha256": A}), row("a-2", {"sha256": B, "store": "git-ref"})]
    snapshot = build_snapshot(rows)
    store = AttachmentStore(git)
    listed = store.listing(project, snapshot)
    assert listed == {blob_path(A), blob_path(B)}
    assert store.listing(project, snapshot) is listed
    assert [args for _, args in git.calls] == [ls_tree(HOST), ls_tree(SHARED)]
    store.listing(project, build_snapshot(rows))
    assert len(git.calls) == 4


# REQ-BEADS-031 (One listing per snapshot): requests at once for a new snapshot list it once
def test_beads_031_one_listing_under_concurrency(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit(delay=0.1)
    snapshot = build_snapshot([row("a-1", {"sha256": A})])
    store = AttachmentStore(git)
    found: list[frozenset[str]] = []
    workers = [
        threading.Thread(target=lambda: found.append(store.listing(project, snapshot)))
        for _ in range(4)
    ]
    for worker in workers:
        worker.start()
    for worker in workers:
        worker.join()
    assert len(git.calls) == 2 and len(found) == 4


# REQ-BEADS-031: git that cannot run leaves every git-ref attachment not fetched, logged once,
# without a second command
def test_beads_031_listing_without_git(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    project = alpha(tmp_path)
    git = FakeGit({(project.path, ls_tree(HOST)): GitError("git not found")})
    snapshot = build_snapshot([row("a-1", {"sha256": A})])
    with caplog.at_level(logging.WARNING):
        assert check(AttachmentStore(git), project, snapshot, A) == "not_fetched"
    assert len(git.calls) == 1
    assert [r.getMessage() for r in caplog.records] == [
        "listing the attachments of alpha failed: git not found"
    ]


# REQ-BEADS-031: git failing on the second ref keeps the blobs of the first
def test_beads_031_listing_keeps_the_first_ref(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    project = alpha(tmp_path)
    git = FakeGit({(project.path, ls_tree(SHARED)): GitError("git timed out")})
    git.listing(project.path, HOST, [blob_path(A)])
    snapshot = build_snapshot([row("a-1", {"sha256": A}), row("a-2", {"sha256": B})])
    store = AttachmentStore(git)
    with caplog.at_level(logging.WARNING):
        assert store.listing(project, snapshot) == {blob_path(A)}
    assert check(store, project, snapshot, A) is None
    assert [r.getMessage() for r in caplog.records] == [
        "listing the attachments of alpha failed: git timed out"
    ]


# REQ-BEADS-032 (Bytes refused): the bytes are served only with their hash, as an image, at
# most 10 MB
def test_beads_032_served_checks_the_bytes() -> None:
    assert served(PNG, A) == "image/png"
    assert served(PNG + b"changed", A) is None
    assert served(TEXT, hashlib.sha256(TEXT).hexdigest()) is None
    big = PNG + b"0" * MAX_BYTES
    assert served(big, hashlib.sha256(big).hexdigest()) is None
    edge = PNG + b"0" * (MAX_BYTES - len(PNG))
    assert served(edge, hashlib.sha256(edge).hexdigest()) == "image/png"


# REQ-BEADS-032 (Served): from refs/gin/attachments first, else from refs/gin-console/attachments
def test_beads_032_read_from_the_first_ref_holding_it(tmp_path: Path) -> None:
    project = alpha(tmp_path)
    found = Entry(A, "git-ref", False, None, None)
    both = FakeGit()
    both.blob(project.path, HOST, A, PNG)
    both.blob(project.path, SHARED, A, PNG)
    assert AttachmentStore(both).read(project, found) == (PNG, "image/png")
    assert [args for _, args in both.calls] == [
        ("cat-file", "-s", f"{HOST}:{blob_path(A)}"),
        ("cat-file", "blob", f"{HOST}:{blob_path(A)}"),
    ]
    shared = FakeGit()
    shared.blob(project.path, SHARED, A, PNG)
    assert AttachmentStore(shared).read(project, found) == (PNG, "image/png")
    assert [args[2].split(":")[0] for _, args in shared.calls] == [HOST, SHARED, SHARED]


# REQ-BEADS-032 (Bytes refused): a size over 10 MB is refused before the blob is read
def test_beads_032_size_refused_before_reading(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    name = f"{HOST}:{blob_path(C)}"
    git.answers[(project.path, ("cat-file", "-s", name))] = GitRun(0, b"11534336\n", "")
    git.answers[(project.path, ("cat-file", "blob", name))] = GitRun(0, PNG, "")
    assert AttachmentStore(git).read(project, Entry(C, "git-ref", False, None, None)) is None
    assert [args[1] for _, args in git.calls] == ["-s"]


# REQ-BEADS-032 (Bytes refused): a blob whose hash is not its name, or that is no image
def test_beads_032_read_refuses_bad_bytes(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    git.blob(project.path, SHARED, A, PNG + b"changed")
    git.blob(project.path, SHARED, B, TEXT)
    store = AttachmentStore(git)
    assert store.read(project, Entry(A, "git-ref", False, None, None)) is None
    assert store.read(project, Entry(B, "git-ref", False, None, None)) is None


# REQ-BEADS-032: a blob gone, a size git does not give, or git that cannot run serves nothing
def test_beads_032_read_failures(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    project = alpha(tmp_path)
    found = Entry(A, "git-ref", False, None, None)
    size = (project.path, ("cat-file", "-s", f"{HOST}:{blob_path(A)}"))
    assert AttachmentStore(FakeGit()).read(project, found) is None
    assert AttachmentStore(FakeGit({size: GitRun(0, b"x", "")})).read(project, found) is None
    assert AttachmentStore(FakeGit({size: GitRun(0, b"9", "")})).read(project, found) is None
    failing = FakeGit({size: GitError("git timed out")})
    with caplog.at_level(logging.WARNING):
        assert AttachmentStore(failing).read(project, found) is None
    assert len(failing.calls) == 1
    assert "git timed out" in caplog.text


# REQ-BEADS-032: the local store serves its file inside the project after the same checks
@needs_symlinks
def test_beads_032_read_from_the_local_store(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    put(local_file(project, A))
    put(local_file(project, B), PNG + b"changed")
    secret = PNG + b"secret"  # an image whose hash is its name, but outside the project
    out = hashlib.sha256(secret).hexdigest()
    link(local_file(project, out), put(tmp_path / "secret.png", secret))
    store = AttachmentStore(git)
    assert store.read(project, Entry(A, "local", False, None, None)) == (PNG, "image/png")
    assert store.read(project, Entry(B, "local", False, None, None)) is None
    assert store.read(project, Entry(out, "local", False, None, None)) is None
    assert store.read(project, Entry(A, "s3", False, None, None)) is None
    assert git.calls == []


# REQ-BEADS-026: the valid entries of metadata.attachments, a list or the JSON text of one as bd
# exports it, the sha lower-cased, each sha once
def test_beads_026_entries() -> None:
    assert entries({"attachments": "none"}) == []
    assert entries("none") == []
    assert entries(None) == []
    assert entries({"attachments": json.dumps([{"sha256": A, "caption": "Step 1"}])}) == [
        Entry(A, "git-ref", pruned=False, caption="Step 1", name=None)
    ]
    for text in ('[{"sha256": ', json.dumps({"sha256": A}), json.dumps(A), "[" * 100_000):
        assert entries({"attachments": text}) == [], text[:20]
    assert entries({"attachments": "[" * 100_000 + "]" * 100_000}) == []
    assert entries({"attachments": ["oops", {"sha256": "x"}, {"sha256": A.upper()}]}) == [
        Entry(A, "git-ref", pruned=False, caption=None, name=None)
    ]
    items = [
        {"sha256": B, "store": "local", "caption": "Step 2", "name": "02.png", "path": "/etc/x"},
        {"sha256": C, "store": "s3", "pruned_at": "2026-11-20T10:00:00Z", "caption": " "},
        {"sha256": B, "caption": "again"},
        {"sha256": A, "store": None, "name": 5},
        {"sha256": f" {A}"},
    ]
    expected = [
        Entry(B, "local", pruned=False, caption="Step 2", name="02.png"),
        Entry(C, "s3", pruned=True, caption=None, name=None),
        Entry(A, "git-ref", pruned=False, caption=None, name=None),
    ]
    assert entries({"attachments": items}) == expected
    assert entries({"attachments": json.dumps(items)}) == expected


# REQ-BEADS-032: a sha256 is 64 lower-case hex digits, and its blob lies under its first two
def test_beads_032_sha_and_blob_path() -> None:
    assert SHA256.fullmatch(A) and not SHA256.fullmatch(A.upper())
    assert not SHA256.fullmatch("ab12")
    assert blob_path(A) == f"{A[:2]}/{A}"


# REQ-BEADS-035 (Only the allowed commands): every command the store ran while listing,
# checking and reading is an `ls-tree` or `cat-file` on one of the two refs, in the project
def test_beads_035_only_the_allowed_commands(tmp_path: Path) -> None:
    project, git = alpha(tmp_path), FakeGit()
    git.listing(project.path, SHARED, [blob_path(A)])
    git.blob(project.path, SHARED, A, PNG)
    snapshot = build_snapshot([row("a-1", {"sha256": A}, {"sha256": B, "store": "git-ref"})])
    store = AttachmentStore(git)
    assert [check(store, project, snapshot, sha) for sha in (A, B)] == [None, "not_fetched"]
    assert store.read(project, Entry(A, "git-ref", False, None, None)) == (PNG, "image/png")
    allowed = {ls_tree(ref) for ref in REFS} | {
        ("cat-file", mode, f"{ref}:{blob_path(sha)}")
        for ref in REFS
        for mode in ("-s", "blob")
        for sha in (A, B)
    }
    assert git.calls
    for cwd, args in git.calls:
        assert cwd == project.path and args in allowed, args
        assert not {"push", "update-ref", "refs/gin/attachments-origin"} & set(args)


# REQ-BEADS-035: the real runner starts `git` with the arguments, in the directory, with the
# console's child environment in the C locale and without prompts or input, for at most 30
# seconds, and keeps the blob as bytes
def test_beads_035_run_git_command(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[dict[str, Any]] = []

    def fake_run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[bytes]":
        seen.append({"cmd": cmd, **kwargs})
        return subprocess.CompletedProcess(cmd, 0, b"\x89PNG\xff", b"warn\xff")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setenv("VIRTUAL_ENV", str(tmp_path / "venv"))
    done = run_git(["cat-file", "-s", f"{HOST}:{blob_path(A)}"], tmp_path)
    assert done == GitRun(0, b"\x89PNG\xff", "warn�")
    call = seen[0]
    assert call["cmd"] == ["git", "cat-file", "-s", f"{HOST}:{blob_path(A)}"]
    assert call["cwd"] == tmp_path and call["timeout"] == GIT_TIMEOUT_SECONDS == 30.0
    assert "VIRTUAL_ENV" not in call["env"] and "PATH" in call["env"]
    assert {k: call["env"][k] for k in ("LC_ALL", "LANGUAGE", "GIT_TERMINAL_PROMPT")} == {
        "LC_ALL": "C",
        "LANGUAGE": "C",
        "GIT_TERMINAL_PROMPT": "0",
    }
    assert call["stdin"] is subprocess.DEVNULL
    assert call.get("text") is not True and call["check"] is False


# REQ-BEADS-035: git missing, timed out or refused raises GitError with a short message
@pytest.mark.parametrize(
    ("error", "message"),
    [
        (FileNotFoundError(2, "No such file or directory"), "git not found"),
        (subprocess.TimeoutExpired(["git"], 30.0), "git timed out"),
        (PermissionError(13, "Permission denied"), "git failed: Permission denied"),
    ],
)
def test_beads_035_run_git_errors(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, error: Exception, message: str
) -> None:
    def fake_run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[bytes]":
        raise error

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(GitError, match=f"^{message}$"):
        run_git(["ls-tree", "-r", "--name-only", HOST], tmp_path)
