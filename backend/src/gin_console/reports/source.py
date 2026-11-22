"""Beads of one project for reports, from its `.beads/issues.jsonl` snapshot."""

from collections.abc import Mapping

from pydantic import ValidationError

from gin_console.beads.definitions import bugs_found, is_blocked
from gin_console.beads.kinds import points_of
from gin_console.beads.lanes import is_merge_gate
from gin_console.beads.snapshot import Snapshot
from gin_console.reports.models import ReportBead

_KEYS = (
    "id",
    "title",
    "issue_type",
    "status",
    "assignee",
    "parent",
    "labels",
    "created_at",
    "updated_at",
    "started_at",
    "closed_at",
    "estimated_minutes",
    "priority",
)


def read_beads(snapshot: Snapshot, project: str, reopens: Mapping[str, int]) -> list[ReportBead]:
    beads: list[ReportBead] = []
    bugs = bugs_found(snapshot)
    for ident, raw in snapshot.rows.items():
        if is_merge_gate(raw):
            continue  # a placeholder, not work (REQ-BEADS-019)
        fields = {key: raw[key] for key in _KEYS if raw.get(key) is not None}
        metadata = raw.get("metadata")
        if raw.get("issue_type") == "milestone" and isinstance(metadata, dict):
            for key in ("start", "end", "kickoff"):
                if isinstance(metadata.get(key), str):
                    fields[key] = metadata[key]
        if (points := points_of(metadata)) is not None:
            fields["points"] = points
        if ident in snapshot.parents:
            fields["parent"] = snapshot.parents[ident]
        fields["blocked"] = is_blocked(ident, raw, snapshot)
        try:
            beads.append(
                ReportBead.model_validate(
                    {
                        **fields,
                        "project": project,
                        "reopens": reopens.get(ident, 0),
                        "bugs": bugs.get(ident, 0),
                    }
                )
            )
        except ValidationError:
            continue  # a row with wrong types is left out, as REQ-BEADS-005 does for lists
    return beads
