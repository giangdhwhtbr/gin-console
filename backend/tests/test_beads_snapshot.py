import os
import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fake_export import bead, dep

from gin_console.beads.errors import BeadsError
from gin_console.beads.snapshot import (
    SnapshotStore,
    build_snapshot,
    export_key,
    store_signature,
)


def blocks(ident: str, *targets: str, **extra: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, t, "blocks") for t in targets], **extra)


def child(ident: str, parent: str, **extra: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **extra)


# REQ-BEADS-007
def test_beads_007_blocked_by_an_open_blocker_not_by_a_closed_or_missing_one() -> None:
    snapshot = build_snapshot(
        [
            bead("open-1"),
            bead("done-1", status="closed"),
            blocks("a", "open-1"),
            blocks("b", "done-1"),
            blocks("c", "external:other:cap", "gone-1"),
            blocks("d", "open-1", status="in_progress"),
            blocks("e", "open-1", status="closed"),
            bead("f", dependencies=[dep("f", "open-1", "blocked-by")]),
            bead("g", dependencies=[dep("g", "open-1", "related")]),
        ]
    )
    assert snapshot.blocked == {"a", "d", "f"}
    assert snapshot.ready == {"open-1", "b", "c", "g"}  # open and not blocked


# REQ-BEADS-007
def test_beads_007_a_blocked_ancestor_blocks_its_descendants() -> None:
    snapshot = build_snapshot(
        [
            bead("x"),
            blocks("epic", "x", issue_type="epic"),
            child("epic.1", "epic"),
            child("epic.1.1", "epic.1"),
            child("epic.2", "epic", status="closed"),
            child("free.1", "free"),
            bead("free", issue_type="epic"),
        ]
    )
    assert snapshot.blocked == {"epic", "epic.1", "epic.1.1"}
    assert snapshot.ready == {"x", "free", "free.1"}
    assert snapshot.parents["epic.1.1"] == "epic.1"


# REQ-BEADS-007
def test_beads_007_a_parent_cycle_ends() -> None:
    snapshot = build_snapshot([child("a", "b"), child("b", "a")])
    assert snapshot.ready == {"a", "b"} and snapshot.blocked == frozenset()


# REQ-BEADS-005
@pytest.mark.parametrize("data", [{"x": 1}, "text", 5, None])
def test_beads_005_an_export_that_is_not_a_list_is_not_understood(data: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        build_snapshot(data)


def dolt(project: Path, db: str, content: bytes) -> Path:
    manifest = project / ".beads" / "embeddeddolt" / db / ".dolt" / "noms" / "manifest"
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_bytes(content)
    return manifest


def export_file(project: Path, content: str = "{}\n", at: int = 1_000_000_000) -> Path:
    """Write the project's export file with modification time `at` (nanoseconds)."""
    path = project / ".beads" / "issues.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    os.utime(path, ns=(at, at))
    return path


class Reads:
    """A reader that counts its calls; the n-th read returns bead a-n."""

    def __init__(self) -> None:
        self.calls: list[Path] = []

    def __call__(self, cwd: Path) -> Any:
        self.calls.append(cwd)
        return [bead(f"a-{len(self.calls)}")]


# REQ-BEADS-013
def test_beads_013_signature_is_the_manifest_content(tmp_path: Path) -> None:
    assert store_signature(tmp_path) is None
    manifest = dolt(tmp_path, "proj", b"root-1")
    first = store_signature(tmp_path)
    manifest.touch()  # bd changes the mtime on every read
    assert store_signature(tmp_path) == first
    manifest.write_bytes(b"root-2")
    assert store_signature(tmp_path) != first


# REQ-BEADS-012
def test_beads_012_export_key_is_time_and_size(tmp_path: Path) -> None:
    assert export_key(tmp_path) is None
    export_file(tmp_path, "abc\n", at=7)
    assert export_key(tmp_path) == (7, 4)


# REQ-BEADS-012 (Unchanged file)
def test_beads_012_unchanged_file_not_read_again(tmp_path: Path) -> None:
    export_file(tmp_path, "x" * 2000)
    reads = Reads()
    store = SnapshotStore(reads)
    assert list(store.get(tmp_path).rows) == ["a-1"]
    assert list(store.get(tmp_path).rows) == ["a-1"]
    assert len(reads.calls) == 1


# REQ-BEADS-012 (Changed file)
@pytest.mark.parametrize(
    ("content", "at"),
    [("x" * 2000, 2_000_000_000), ("y" * 2001, 1_000_000_000)],
    ids=["new time", "new size at the same time"],
)
def test_beads_012_changed_file_read_again(tmp_path: Path, content: str, at: int) -> None:
    export_file(tmp_path, "x" * 2000)
    reads = Reads()
    store = SnapshotStore(reads)
    store.get(tmp_path)
    export_file(tmp_path, content, at=at)
    assert list(store.get(tmp_path).rows) == ["a-2"]
    assert len(reads.calls) == 2


# REQ-BEADS-012
def test_beads_012_a_missing_file_is_read_every_time(tmp_path: Path) -> None:
    reads = Reads()
    store = SnapshotStore(reads)
    store.get(tmp_path)
    store.get(tmp_path)
    assert len(reads.calls) == 2


# REQ-BEADS-012 (Refresh)
def test_beads_012_refresh_clears(tmp_path: Path) -> None:
    export_file(tmp_path)
    reads = Reads()
    store = SnapshotStore(reads)
    store.get(tmp_path)
    store.clear()
    store.get(tmp_path)
    assert len(reads.calls) == 2


# REQ-BEADS-004 (Errors are not kept)
def test_beads_004_errors_are_not_kept(tmp_path: Path) -> None:
    export_file(tmp_path)
    answers: list[Any] = [BeadsError("unreadable"), [bead("a-1")]]

    def read(cwd: Path) -> Any:
        answer = answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    store = SnapshotStore(read)
    with pytest.raises(BeadsError):
        store.get(tmp_path)
    assert list(store.get(tmp_path).rows) == ["a-1"]


# REQ-BEADS-004 (Overlapping requests)
def test_beads_004_overlapping_reads_once(tmp_path: Path) -> None:
    export_file(tmp_path)
    reads = Reads()

    def slow(cwd: Path) -> Any:
        time.sleep(0.05)
        return reads(cwd)

    store = SnapshotStore(slow)
    threads = [threading.Thread(target=store.get, args=(tmp_path,)) for _ in range(3)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(reads.calls) == 1


# REQ-BEADS-013 (Fresh export, Write not exported, Export catches up)
def test_beads_013_stale_when_manifest_moves(tmp_path: Path) -> None:
    manifest = dolt(tmp_path, "db", b"root-1")
    export_file(tmp_path)
    reads = Reads()
    store = SnapshotStore(reads)
    store.get(tmp_path)
    assert store.is_stale(tmp_path) is False
    manifest.write_bytes(b"root-2")
    assert store.is_stale(tmp_path) is True
    assert list(store.get(tmp_path).rows) == ["a-1"]  # the file is unchanged: no read
    assert store.is_stale(tmp_path) is True
    export_file(tmp_path, at=2_000_000_000)
    assert list(store.get(tmp_path).rows) == ["a-2"]
    assert store.is_stale(tmp_path) is False


# REQ-BEADS-013
def test_beads_013_a_write_during_the_read_shows_as_stale(tmp_path: Path) -> None:
    manifest = dolt(tmp_path, "db", b"root-1")
    export_file(tmp_path)

    def read(cwd: Path) -> Any:
        manifest.write_bytes(b"root-2")  # bd writes while the file is read
        return [bead("a-1")]

    store = SnapshotStore(read)
    store.get(tmp_path)
    assert store.is_stale(tmp_path) is True


# REQ-BEADS-013 (No manifest)
def test_beads_013_no_manifest_never_stale(tmp_path: Path) -> None:
    export_file(tmp_path)
    store = SnapshotStore(Reads())
    store.get(tmp_path)
    assert store.is_stale(tmp_path) is False
    dolt(tmp_path, "db", b"root-1")  # a manifest that appears later was not seen at the read
    assert store.is_stale(tmp_path) is False


# REQ-BEADS-013
def test_beads_013_not_stale_before_any_read(tmp_path: Path) -> None:
    dolt(tmp_path, "db", b"root-1")
    export_file(tmp_path)
    assert SnapshotStore(Reads()).is_stale(tmp_path) is False
