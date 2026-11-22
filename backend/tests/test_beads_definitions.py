from typing import Any

from fake_export import bead, dep

from gin_console.beads.definitions import (
    Counts,
    bugs_found,
    child_counts,
    is_blocked,
    person_key,
)
from gin_console.beads.snapshot import build_snapshot


def blocks(ident: str, *targets: str, **extra: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, t, "blocks") for t in targets], **extra)


def child(ident: str, parent: str, **extra: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **extra)


def _blocked(rows: list[dict[str, Any]], ident: str) -> bool:
    snapshot = build_snapshot(rows)
    return is_blocked(ident, snapshot.rows[ident], snapshot)


# REQ-BEADS-021
def test_beads_021_status_blocked_without_blockers_is_blocked() -> None:
    assert _blocked([bead("a", status="blocked")], "a")


# REQ-BEADS-021
def test_beads_021_open_blocker_blocks_in_progress_bead() -> None:
    assert _blocked([bead("x"), blocks("a", "x", status="in_progress")], "a")


# REQ-BEADS-021
def test_beads_021_child_of_a_blocked_epic_is_blocked() -> None:
    rows = [bead("x"), blocks("e", "x", issue_type="epic"), child("t", "e")]
    assert _blocked(rows, "t")


# REQ-BEADS-021
def test_beads_021_closed_bead_is_never_blocked() -> None:
    assert not _blocked([bead("x"), blocks("a", "x", status="closed")], "a")
    assert not _blocked([bead("b", status="closed")], "b")


# REQ-BEADS-021
def test_beads_021_external_blocker_does_not_block() -> None:
    assert not _blocked([blocks("a", "external:other:cap")], "a")


# REQ-BEADS-022
def test_beads_022_child_counts_skip_gates_and_split_prep() -> None:
    snapshot = build_snapshot(
        [
            bead("e-1", issue_type="epic"),
            child("t-1", "e-1", status="closed"),
            child("t-2", "e-1", status="closed"),
            child("t-3", "e-1"),
            child("p-1", "e-1", status="closed", labels=["prep"]),
            child("g-1", "e-1", title="external: .planning/plans/p.md#1"),
        ]
    )
    assert child_counts(snapshot) == {"e-1": Counts(3, 2, 1, 1)}


# REQ-BEADS-022
def test_beads_022_a_task_without_children_has_no_counts() -> None:
    assert "t-1" not in child_counts(build_snapshot([bead("t-1")]))


# REQ-BEADS-023
def test_beads_023_person_key_is_the_lowercased_local_part() -> None:
    assert person_key("  GiangDHWHTBR@gmail.com ") == "giangdhwhtbr"
    assert person_key("giangdhwhtbr") == "giangdhwhtbr"
    assert person_key("") is None
    assert person_key(None) is None
    assert person_key("@x") == "@x"


def _found(rows: list[dict[str, Any]]) -> dict[str, int]:
    return bugs_found(build_snapshot(rows))


def _found_from(ident: str, target: str, **extra: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, target, "discovered-from")], **extra)


# REQ-REPORTS-019
def test_reports_019_bugs_found_counts_open_and_closed_bugs_not_tasks() -> None:
    rows = [
        bead("a-1"),
        _found_from("a-9", "a-1", issue_type="bug", status="closed"),
        _found_from("a-10", "a-1", issue_type="bug"),
        _found_from("a-11", "a-1", issue_type="task"),
    ]
    assert _found(rows) == {"a-1": 2}


# REQ-REPORTS-019
def test_reports_019_bugs_found_ignores_other_dependency_kinds_and_none() -> None:
    rows = [bead("a-1"), blocks("a-2", "a-1", issue_type="bug"), bead("a-3", issue_type="bug")]
    assert _found(rows) == {}
