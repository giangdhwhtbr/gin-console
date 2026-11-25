from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fake_export import bead, dep, write_export

from gin_console.beads.snapshot import SnapshotStore, build_snapshot
from gin_console.beads.source import list_beads, read_export
from gin_console.overview.service import build_overview
from gin_console.projects.models import Beads
from gin_console.projects.source import count_beads
from gin_console.reports.scope import MilestoneScope
from gin_console.reports.source import read_beads
from gin_console.reports.team import build_team

NOW = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)


def under(ident: str, parent: str, **fields: Any) -> dict[str, Any]:
    extra = fields.pop("deps", [])
    return bead(ident, dependencies=[dep(ident, parent, "parent-child"), *extra], **fields)


# REQ-BEADS-021
def test_beads_021_blocked_counts_agree(tmp_path: Path) -> None:
    blocked_by_a = [dep("c", "a", "blocks")]
    rows = [
        bead(
            "m1",
            issue_type="milestone",
            metadata={"start": "2026-11-02", "end": "2026-11-27"},
        ),
        under("f", "m1", issue_type="epic"),
        under("a", "f"),
        under("e", "f", issue_type="epic", deps=[dep("e", "a", "blocks")]),
        under("e.1", "e"),
        under("b", "f", status="blocked"),
        under("c", "f", status="in_progress", deps=blocked_by_a),
        under("d", "f", status="in_progress"),
    ]
    write_export(tmp_path, rows)
    snapshot = SnapshotStore(read_export).get(tmp_path)
    counted = count_beads(SnapshotStore(read_export), tmp_path)
    assert isinstance(counted, Beads)
    everything = list_beads(snapshot, closed=True)
    listed = [b for b in everything if b.blocked and b.issue_type != "milestone"]
    team = build_team(
        read_beads(build_snapshot(rows), "alpha", {}),
        now=NOW,
        project="alpha",
        scope=MilestoneScope("m1"),
    ).team
    assert team is not None
    assert (counted.blocked, len(listed)) == (4, 4)
    assert team.blocked == 3
    assert (
        len(build_overview(build_snapshot(rows), "alpha", 3, NOW, False).blocked) == counted.blocked
    )
