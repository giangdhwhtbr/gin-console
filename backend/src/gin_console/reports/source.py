"""Beads of one project for reports, from its `.beads/issues.jsonl` snapshot; parses
`metadata.ai_usage`."""

import json
from typing import Any

from pydantic import ValidationError

from gin_console.beads.snapshot import Snapshot
from gin_console.reports.models import AiUsage, ReportBead

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


def parse_usage(metadata: Any) -> tuple[AiUsage | None, str | None]:
    """(usage, None) when readable; (None, None) when absent; (None, problem) otherwise."""
    raw = metadata.get("ai_usage") if isinstance(metadata, dict) else None
    if raw is None:
        return None, None
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return None, "unreadable"
    if not isinstance(raw, dict):
        return None, "unreadable"
    if raw.get("version") != 1:
        return None, f"version {raw.get('version')}"
    try:
        return AiUsage.model_validate(raw), None
    except ValidationError:
        return None, "unreadable"


def read_beads(snapshot: Snapshot, project: str) -> list[ReportBead]:
    beads: list[ReportBead] = []
    for ident, raw in snapshot.rows.items():
        usage, problem = parse_usage(raw.get("metadata"))
        fields = {key: raw[key] for key in _KEYS if raw.get(key) is not None}
        metadata = raw.get("metadata")
        if raw.get("issue_type") == "milestone" and isinstance(metadata, dict):
            for key in ("start", "end", "kickoff"):
                if isinstance(metadata.get(key), str):
                    fields[key] = metadata[key]
        if ident in snapshot.parents:
            fields["parent"] = snapshot.parents[ident]
        try:
            beads.append(
                ReportBead.model_validate(
                    {**fields, "project": project, "usage": usage, "usage_problem": problem}
                )
            )
        except ValidationError:
            continue  # a row with wrong types is left out, as REQ-BEADS-005 does for lists
    return beads
