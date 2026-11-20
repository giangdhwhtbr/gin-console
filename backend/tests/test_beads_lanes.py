import json
from typing import Any

from fake_export import bead, dep

from gin_console.beads.snapshot import Snapshot, build_snapshot
from gin_console.beads.source import get_bead, list_beads

PLAN = ".planning/plans/2026-11-20-shop.md"


def snap(*rows: Any) -> Snapshot:
    return build_snapshot(list(rows))


def listed(*rows: Any) -> dict[str, Any]:
    return {b.id: b for b in list_beads(snap(*rows), closed=True)}


def child(ident: str, parent: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **fields)


def gate(ident: str, plan: str, number: int, **fields: Any) -> dict[str, Any]:
    return bead(ident, title=f"external: {plan}#{number}", **fields)


# REQ-BEADS-019
def test_beads_019_track_of_a_lane() -> None:
    claim = {"holder": "ann@x.io", "expires_at": "2026-11-20T16:00:00Z"}
    row = bead(
        "t-1",
        description=f"Intro\nPlan: {PLAN}, Track 2\nLane: be\n",
        labels=["lane:be", "track:2"],
        metadata={"claim": claim},
    )
    found = listed(row)["t-1"]
    assert found.lane == "be"
    assert found.track is not None and (found.track.plan, found.track.number) == (PLAN, 2)
    assert found.claim is not None
    assert found.claim.model_dump(mode="json") == claim


# REQ-BEADS-019
def test_beads_019_backticked_plan_and_lane() -> None:
    row = bead("t-1", description=f"Plan: `{PLAN}`, Track 3\nLane: `qa`")
    found = listed(row)["t-1"]
    assert found.lane == "qa"
    assert found.track is not None and (found.track.plan, found.track.number) == (PLAN, 3)


# REQ-BEADS-019
def test_beads_019_labels_only() -> None:
    found = listed(bead("t-1", labels=["lane:fe", "track:3"]))["t-1"]
    assert found.lane == "fe"
    assert found.track is not None and (found.track.plan, found.track.number) == (None, 3)


# REQ-BEADS-019
def test_beads_019_no_lane_no_track_no_claim_no_gate() -> None:
    found = listed(bead("t-1", labels=["track:api", "lane:Back End"]))["t-1"]
    assert (found.lane, found.track, found.claim, found.waits_for) == (None, None, None, None)


# REQ-BEADS-019
def test_beads_019_claim_as_a_json_string() -> None:
    text = json.dumps({"holder": "bao@x.io", "expires_at": "2026-11-21T09:00:00Z"})
    by_id = listed(
        bead("a", metadata={"claim": text}),
        bead("b", metadata={"claim": "soon"}),
    )
    claim = by_id["a"].claim
    assert claim is not None
    assert claim.model_dump(mode="json")["expires_at"] == "2026-11-21T09:00:00Z"
    assert by_id["b"].claim is None


# REQ-BEADS-019
def test_beads_019_bad_claims_are_null() -> None:
    good = "2026-11-21T09:00:00Z"
    by_id = listed(
        bead("a", metadata={"claim": {"holder": "", "expires_at": good}}),
        bead("b", metadata={"claim": {"holder": "ann", "expires_at": "2026-11-21 09:00"}}),
        bead("c", metadata={"claim": {"holder": 7, "expires_at": good}}),
        bead("d", metadata={"claim": {"holder": "ann", "expires_at": "2026-13-45T99:00:00Z"}}),
        bead("e", metadata=["claim"]),
    )
    assert [b.claim for b in by_id.values()] == [None] * 5


# REQ-BEADS-019
def test_beads_019_not_a_lane_name() -> None:
    assert listed(bead("t-1", description="Lane: Back End"))["t-1"].lane is None


def tracks() -> list[dict[str, Any]]:
    return [
        bead("e-1", issue_type="epic"),
        child("e-1.2", "e-1", description=f"Plan: {PLAN}, Track 2\nLane: be"),
        child("e-1.4", "e-1", description=f"Plan: {PLAN}, Track 4\nLane: qa"),
    ]


def blocked_by_gate(rows: list[dict[str, Any]], gate_id: str) -> list[dict[str, Any]]:
    return [
        {**r, "dependencies": [*r["dependencies"], dep("e-1.4", gate_id, "blocks")]}
        if r["id"] == "e-1.4"
        else r
        for r in rows
    ]


# REQ-BEADS-019
def test_beads_019_merge_gate_without_a_parent() -> None:
    rows = blocked_by_gate(tracks(), "g-1") + [gate("g-1", PLAN, 2)]
    by_id = listed(*rows)
    waits = by_id["g-1"].waits_for
    assert waits is not None
    assert waits.model_dump() == {"plan": PLAN, "number": 2, "track_id": "e-1.2", "lane": "be"}
    assert all(b.waits_for is None for i, b in by_id.items() if i != "g-1")


# REQ-BEADS-019
def test_beads_019_merge_gate_with_a_parent() -> None:
    rows = [*tracks(), gate("g-1", PLAN, 2, dependencies=[dep("g-1", "e-1", "parent-child")])]
    waits = listed(*rows)["g-1"].waits_for
    assert waits is not None and (waits.track_id, waits.lane) == ("e-1.2", "be")


# REQ-BEADS-019
def test_beads_019_gate_takes_the_parent_of_the_first_blocked_bead_by_id() -> None:
    rows = [
        *tracks(),
        bead("e-2", issue_type="epic"),
        child("e-2.1", "e-2", description=f"Plan: {PLAN}, Track 2\nLane: other"),
        gate("g-1", PLAN, 2),
    ]
    rows = [
        {**r, "dependencies": [*r.get("dependencies", []), dep(r["id"], "g-1", "blocks")]}
        if r["id"] in ("e-2.1", "e-1.4")
        else r
        for r in rows
    ]
    waits = listed(*rows)["g-1"].waits_for
    assert waits is not None and (waits.track_id, waits.lane) == ("e-1.2", "be")


# REQ-BEADS-019
def test_beads_019_track_not_found() -> None:
    other = ".planning/plans/other.md"
    rows = [*tracks(), gate("g-1", other, 7, dependencies=[dep("g-1", "e-1", "parent-child")])]
    waits = listed(*rows)["g-1"].waits_for
    assert waits is not None
    assert waits.model_dump() == {"plan": other, "number": 7, "track_id": None, "lane": None}


# REQ-BEADS-019
def test_beads_019_gate_without_a_parent_or_blocked_bead_finds_no_track() -> None:
    waits = listed(*tracks(), gate("g-1", PLAN, 2))["g-1"].waits_for
    assert waits is not None and (waits.track_id, waits.lane) == (None, None)


# REQ-BEADS-019
def test_beads_019_number_alone_matches_when_the_plan_differs_and_one_child_has_it() -> None:
    rows = [
        bead("e-1", issue_type="epic"),
        child("e-1.2", "e-1", labels=["lane:be", "track:2"]),
        gate("g-1", PLAN, 2, dependencies=[dep("g-1", "e-1", "parent-child")]),
    ]
    waits = listed(*rows)["g-1"].waits_for
    assert waits is not None and (waits.track_id, waits.lane) == ("e-1.2", "be")


# REQ-BEADS-019
def test_beads_019_two_children_with_the_number_find_no_track() -> None:
    rows = [
        bead("e-1", issue_type="epic"),
        child("e-1.2", "e-1", labels=["lane:be", "track:2"]),
        child("e-1.3", "e-1", labels=["lane:fe", "track:2"]),
        gate("g-1", PLAN, 2, dependencies=[dep("g-1", "e-1", "parent-child")]),
    ]
    waits = listed(*rows)["g-1"].waits_for
    assert waits is not None and (waits.track_id, waits.lane) == (None, None)


# REQ-BEADS-019
def test_beads_019_another_gate_is_never_the_track() -> None:
    rows = [
        bead("e-1", issue_type="epic"),
        gate("g-0", PLAN, 2, dependencies=[dep("g-0", "e-1", "parent-child")], labels=["track:2"]),
        gate("g-1", PLAN, 2, dependencies=[dep("g-1", "e-1", "parent-child")]),
    ]
    waits = listed(*rows)["g-1"].waits_for
    assert waits is not None and waits.track_id is None


# REQ-BEADS-019
def test_beads_019_gate_in_the_relations() -> None:
    rows = blocked_by_gate(tracks(), "g-1") + [gate("g-1", PLAN, 2)]
    detail = get_bead(snap(*rows), "e-1.4")
    gate_relation = next(r for r in detail.dependencies if r.id == "g-1")
    waits = gate_relation.waits_for
    assert waits is not None and (waits.track_id, waits.lane) == ("e-1.2", "be")
    assert get_bead(snap(*rows), "g-1").dependents[0].waits_for is None
    parent = get_bead(snap(*rows), "e-1")
    assert [c.id for c in parent.children] == ["e-1.2", "e-1.4"]
