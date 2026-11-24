"""Milestone and points history of an epic, as gin-workflow writes it (REQ-REPORTS-021)."""

import json
from datetime import date, datetime

from gin_console.beads.kinds import POINT_SCALE
from gin_console.reports.models import MilestoneMove, PointsChange, ReportBead


def _entries(raw: object) -> list[tuple[datetime, dict[str, object]]]:
    """The entries of a list, or of JSON text of a list, that are objects with an ISO `at`,
    sorted by `at`. Anything else gives none."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    if not isinstance(raw, list):
        return []
    found: list[tuple[datetime, dict[str, object]]] = []
    for item in raw:
        if not isinstance(item, dict) or not isinstance(item.get("at"), str):
            continue
        try:
            at = datetime.fromisoformat(item["at"])
        except ValueError:
            continue
        found.append((at, item))
    found.sort(key=lambda pair: pair[0].timestamp())  # a naive `at` is local time
    return found


def _is_count(value: object) -> bool:
    return value is None or type(value) is int


def _on_scale(value: object) -> int | None:
    """The points when on the scale, else none."""
    return value if type(value) is int and value in POINT_SCALE else None


def parse_moves(raw: object) -> list[MilestoneMove]:
    moves: list[MilestoneMove] = []
    for at, item in _entries(raw):
        source, target = item.get("from"), item.get("to")
        if isinstance(source, str | None) and isinstance(target, str | None):
            moves.append(MilestoneMove(day=at.astimezone().date(), source=source, target=target))
    return moves


def parse_points(raw: object) -> list[PointsChange]:
    changes: list[PointsChange] = []
    for at, item in _entries(raw):
        before, after = item.get("from"), item.get("to")
        if _is_count(before) and _is_count(after):
            changes.append(
                PointsChange(
                    day=at.astimezone().date(),
                    before=_on_scale(before),
                    after=_on_scale(after),
                )
            )
    return changes


def _since(bead: ReportBead, day: date) -> bool:
    return day >= bead.created_at.astimezone().date()


def milestone_on(bead: ReportBead, day: date) -> str | None:
    """The milestone the epic belongs to on `day`, or None. Without moves it is the current
    parent; the caller checks that it is a milestone."""
    if not bead.moves:
        return bead.parent if _since(bead, day) else None
    last = [move for move in bead.moves if move.day <= day]
    if last:
        return last[-1].target
    return bead.moves[0].source if _since(bead, day) else None


def points_on(bead: ReportBead, day: date) -> int | None:
    """The epic's points on `day`, or None."""
    if not bead.points_history:
        return bead.points if _since(bead, day) else None
    last = [change for change in bead.points_history if change.day <= day]
    return last[-1].after if last else None
