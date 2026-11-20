"""Lane, track, claim and merge gate fields read from exported rows (REQ-BEADS-019); no I/O.

The patterns follow gin-workflow's team mode (`team_pending`, `team_beads`)."""

import json
import re
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from typing import Any

from pydantic import ValidationError

from gin_console.beads.models import Claim, GateRef, TrackRef
from gin_console.beads.snapshot import BLOCKING, Snapshot

LANE_NAME = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_TRACK_LINE = re.compile(r"^Plan:\s*`?([^`,\n]+?)`?,\s*Track\s+(\d+)\b", re.MULTILINE)
_LANE_LINE = re.compile(r"^Lane:\s*`?([a-z0-9][a-z0-9-]*)`?\s*$", re.MULTILINE)
_TRACK_LABEL = re.compile(r"^track:(\d+)$")
_EXTERNAL = re.compile(r"^external: (\S+)#(\d+)$")
_STAMP = "%Y-%m-%dT%H:%M:%SZ"


def lane_of(description: str, labels: Sequence[str]) -> str | None:
    """The `Lane:` line, else the first `lane:<name>` label; None when neither is a lane name."""
    line = _LANE_LINE.search(description)
    if line:
        return line[1]
    for label in labels:
        name = label.removeprefix("lane:")
        if name != label and LANE_NAME.match(name):
            return name
    return None


def track_of(description: str, labels: Sequence[str]) -> TrackRef | None:
    """The `Plan: <path>, Track <N>` line, else the first `track:<N>` label."""
    line = _TRACK_LINE.search(description)
    if line:
        return TrackRef(plan=line[1], number=int(line[2]))
    for label in labels:
        found = _TRACK_LABEL.match(label)
        if found:
            return TrackRef(plan=None, number=int(found[1]))
    return None


def claim_of(metadata: object) -> Claim | None:
    """`metadata.claim` (object or JSON string): a holder and a `YYYY-MM-DDTHH:MM:SSZ` lease."""
    value = metadata.get("claim") if isinstance(metadata, Mapping) else None
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            return None
    if not isinstance(value, Mapping):
        return None
    holder, stamp = value.get("holder"), value.get("expires_at")
    if not isinstance(holder, str) or not holder or not isinstance(stamp, str):
        return None
    try:
        expires_at = datetime.strptime(stamp, _STAMP).replace(tzinfo=UTC)
        return Claim(holder=holder, expires_at=expires_at)
    except (ValueError, ValidationError):
        return None


def gate_of(title: object) -> tuple[str, int] | None:
    """(plan path, track number) of a merge gate title `external: <path>#<N>`."""
    found = _EXTERNAL.match(title) if isinstance(title, str) else None
    return (found[1], int(found[2])) if found else None


def is_merge_gate(row: Mapping[str, Any]) -> bool:
    return gate_of(row.get("title")) is not None


def _text(row: Mapping[str, Any]) -> tuple[str, list[str]]:
    description, labels = row.get("description"), row.get("labels")
    return (
        description if isinstance(description, str) else "",
        [x for x in labels if isinstance(x, str)] if isinstance(labels, list) else [],
    )


def _gate_parent(snapshot: Snapshot, ident: str) -> str | None:
    """The gate's parent, else the parent of the first bead (by id) it blocks."""
    if ident in snapshot.parents:
        return snapshot.parents[ident]
    blocked = sorted(i for i, kind in snapshot.dependents.get(ident, []) if kind in BLOCKING)
    return snapshot.parents.get(blocked[0]) if blocked else None


def _tracks_under(snapshot: Snapshot, parent: str) -> list[tuple[str, TrackRef, str | None]]:
    """(id, track, lane) of the children of `parent` that are tracks and not merge gates."""
    found: list[tuple[str, TrackRef, str | None]] = []
    for child, kind in snapshot.dependents.get(parent, []):
        row = snapshot.rows.get(child)
        if kind != "parent-child" or row is None or is_merge_gate(row):
            continue
        description, labels = _text(row)
        track = track_of(description, labels)
        if track is not None:
            found.append((child, track, lane_of(description, labels)))
    return found


def gate_ref(snapshot: Snapshot, ident: str) -> GateRef | None:
    """What the merge gate `ident` waits for, with the track it names when that is found."""
    wanted = gate_of(snapshot.rows[ident].get("title"))
    if wanted is None:
        return None
    plan, number = wanted
    parent = _gate_parent(snapshot, ident)
    tracks = [t for t in _tracks_under(snapshot, parent) if t[1].number == number] if parent else []
    exact = [t for t in tracks if t[1].plan == plan]
    match = exact[0] if len(exact) == 1 else tracks[0] if len(tracks) == 1 else None
    return GateRef(
        plan=plan,
        number=number,
        track_id=match[0] if match else None,
        lane=match[2] if match else None,
    )
