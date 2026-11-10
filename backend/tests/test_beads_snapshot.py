import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fake_bd import bead, dep

from gin_console.beads.errors import BeadsError
from gin_console.beads.snapshot import TTL_SECONDS, SnapshotStore, build_snapshot, store_signature


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


class Exports:
    def __init__(self) -> None:
        self.calls: list[Path] = []

    def __call__(self, cwd: Path) -> Any:
        self.calls.append(cwd)
        return [bead(f"a-{len(self.calls)}")]


# REQ-BEADS-012
def test_beads_012_signature_is_the_manifest_content(tmp_path: Path) -> None:
    assert store_signature(tmp_path) is None
    manifest = dolt(tmp_path, "proj", b"root-1")
    first = store_signature(tmp_path)
    manifest.touch()  # bd changes the mtime on every read
    assert store_signature(tmp_path) == first
    manifest.write_bytes(b"root-2")
    assert store_signature(tmp_path) != first


# REQ-BEADS-012
def test_beads_012_one_export_until_the_store_changes(tmp_path: Path) -> None:
    manifest = dolt(tmp_path, "proj", b"root-1")
    exports = Exports()
    store = SnapshotStore(exports)
    assert list(store.get(tmp_path).rows) == ["a-1"]
    assert list(store.get(tmp_path).rows) == ["a-1"]
    manifest.write_bytes(b"root-2")
    assert list(store.get(tmp_path).rows) == ["a-2"]
    assert len(exports.calls) == 2


# REQ-BEADS-012
def test_beads_012_without_a_manifest_the_snapshot_lasts_the_ttl(tmp_path: Path) -> None:
    now = [100.0]
    exports = Exports()
    store = SnapshotStore(exports, clock=lambda: now[0])
    store.get(tmp_path)
    now[0] += TTL_SECONDS - 0.1
    store.get(tmp_path)
    assert len(exports.calls) == 1
    now[0] += 0.2
    store.get(tmp_path)
    assert len(exports.calls) == 2


# REQ-BEADS-012
def test_beads_012_clear_exports_again(tmp_path: Path) -> None:
    dolt(tmp_path, "proj", b"root-1")
    exports = Exports()
    store = SnapshotStore(exports)
    store.get(tmp_path)
    store.clear()
    store.get(tmp_path)
    assert len(exports.calls) == 2


# REQ-BEADS-012
def test_beads_012_a_failed_export_is_not_kept(tmp_path: Path) -> None:
    dolt(tmp_path, "proj", b"root-1")
    answers: list[Any] = [BeadsError("bd not found"), [bead("a-1")]]

    def export(cwd: Path) -> Any:
        answer = answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer

    store = SnapshotStore(export)
    with pytest.raises(BeadsError):
        store.get(tmp_path)
    assert list(store.get(tmp_path).rows) == ["a-1"]


# REQ-BEADS-012
def test_beads_012_overlapping_requests_export_once(tmp_path: Path) -> None:
    dolt(tmp_path, "proj", b"root-1")
    exports = Exports()

    def slow(cwd: Path) -> Any:
        time.sleep(0.05)
        return exports(cwd)

    store = SnapshotStore(slow)
    threads = [threading.Thread(target=store.get, args=(tmp_path,)) for _ in range(3)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert len(exports.calls) == 1
