"""WBS rows of a project or one milestone from the Beads snapshot and the gin plans
(REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028). Pure: no HTTP, no files, no spreadsheet library."""

from collections.abc import Mapping
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel

from gin_console.beads.definitions import Counts, child_counts, is_blocked, is_done, person_key
from gin_console.beads.kinds import points_of
from gin_console.beads.lanes import is_merge_gate
from gin_console.beads.prep import row_is_prep
from gin_console.beads.snapshot import BLOCKING, Snapshot, _deps
from gin_console.milestones.models import EpicPlan, ForecastEpic, MilestoneDetail, MilestoneList

WORKDAY_MINUTES = 480
UNASSIGNED = "Unassigned"
Status = Literal["Open", "In progress", "Blocked", "Done"]
Row = dict[str, Any]


class WbsRow(BaseModel):
    wbs: str
    level: int
    id: str
    parent_id: str | None
    milestone_title: str | None
    name: str
    issue_type: str
    type_label: str
    status: Status
    blocked: bool
    assignee: str
    assignee_email: str | None
    points: int | None
    estimate_days: float | None
    estimate_assumed: bool
    planned_start: date | None
    planned_end: date | None
    forecast_end: date | None
    percent_done: float | None
    depends_on_wbs: list[str]
    depends_on_ids: list[str]


class WbsDocument(BaseModel):
    project: str
    scope_label: str
    milestone_id: str | None
    generated_at: datetime
    warning: str | None
    rows: list[WbsRow]


def _day(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _metadata(row: Row, key: str) -> object:
    meta = row.get("metadata")
    return meta.get(key) if isinstance(meta, dict) else None


def _in_wbs(row: Row) -> bool:
    return not row_is_prep(row) and not is_merge_gate(row)


def _status(ident: str, row: Row, snapshot: Snapshot) -> Status:
    if is_done(row):
        return "Done"
    if is_blocked(ident, row, snapshot):
        return "Blocked"
    return "In progress" if row.get("status") in ("in_progress", "hooked") else "Open"


def _type_label(row: Row) -> str:
    kind = row.get("issue_type")
    return kind.replace("_", " ").replace("-", " ").capitalize() if kind else "Task"


def _priority(row: Row) -> int:
    value = row.get("priority")
    return value if isinstance(value, int) else 99


def build_wbs(
    project: str,
    snapshot: Snapshot,
    listing: MilestoneList | None,
    details: Mapping[str, MilestoneDetail],
    *,
    milestone_id: str | None = None,
    generated_at: datetime,
    warning: str | None = None,
) -> WbsDocument:
    rows = snapshot.rows
    counts = child_counts(snapshot)
    entries = {m.id: m for m in listing.milestones} if listing else {}
    forecast: dict[str, ForecastEpic] = (
        {e.id: e for e in listing.forecast.epics} if listing and listing.forecast else {}
    )

    def is_milestone(ident: str | None) -> bool:
        return ident in rows and rows[ident].get("issue_type") == "milestone"

    def is_epic(ident: str) -> bool:
        return rows[ident].get("issue_type") == "epic"

    def plan_of(epic: str) -> EpicPlan | None:
        parent = snapshot.parents.get(epic)
        detail = details.get(parent) if is_milestone(parent) and parent else None
        return next((p for p in detail.epics if p.id == epic), None) if detail else None

    def planned(epic: str) -> tuple[date | None, date | None]:
        """Planned dates of an epic: its milestone's plan, else the forecast of the list."""
        if is_milestone(snapshot.parents.get(epic)):
            plan = plan_of(epic)
            return (_day(plan.planned_start), _day(plan.planned_end)) if plan else (None, None)
        item = forecast.get(epic)
        return (_day(item.planned_start), _day(item.planned_end)) if item else (None, None)

    def planned_start(ident: str) -> date:
        if is_milestone(ident):
            start = _day(_metadata(rows[ident], "start")) or (
                _day(entries[ident].start) if ident in entries else None
            )
        else:
            start = planned(ident)[0] if is_epic(ident) else None
        return start or date.max

    def order(ident: str) -> tuple[int, date, int, str, str]:
        row = rows[ident]
        epic = is_milestone(ident) or is_epic(ident)
        return (
            0 if epic else 1,
            planned_start(ident) if epic else date.max,
            _priority(row),
            str(row.get("created_at") or ""),
            ident,
        )

    children: dict[str, list[str]] = {}
    for child, parent in snapshot.parents.items():
        if child in rows and parent in rows and _in_wbs(rows[child]):
            children.setdefault(parent, []).append(child)
    for kids in children.values():
        kids.sort(key=order)

    def is_root(ident: str) -> bool:
        parent = snapshot.parents.get(ident)
        return parent is None or parent not in rows

    def roots() -> list[str]:
        if milestone_id is not None:
            return [milestone_id] if is_milestone(milestone_id) else []
        pool = [i for i, r in rows.items() if _in_wbs(r) and is_root(i)]

        def root_key(i: str) -> tuple[int, date, int, str, str]:
            if is_milestone(i):  # milestones: planned start, then id only
                return (0, planned_start(i), 0, "", i)
            return (1 if is_epic(i) else 2, *order(i)[1:])

        return sorted(pool, key=root_key)

    flat: list[tuple[str, str | None, str]] = []  # (id, parent, wbs)
    seen: set[str] = set()

    def walk(ident: str, parent: str | None, number: str) -> None:
        if ident in seen:
            return
        seen.add(ident)
        flat.append((ident, parent, number))
        for n, kid in enumerate(children.get(ident, []), 1):
            walk(kid, ident, f"{number}.{n}")

    top = roots()
    for n, ident in enumerate(top, 1):
        walk(ident, None, str(n))
    if milestone_id is None:  # beads only a cycle holds: roots in their own right, in id order
        for ident in sorted(i for i, r in rows.items() if _in_wbs(r)):
            if ident in seen:
                continue
            walk(ident, None, str(len(top) + 1))
            top.append(ident)
    number_of = {ident: number for ident, _, number in flat}

    def milestone_of(ident: str) -> str | None:
        current: str | None = ident
        visited: set[str] = set()
        while current is not None and current in rows and current not in visited:
            if is_milestone(current):
                return current
            visited.add(current)
            current = snapshot.parents.get(current)
        return None

    def epic_estimate(epic: str) -> tuple[float | None, bool]:
        plan = plan_of(epic)
        if plan is None:
            return None, False
        if plan.estimate_days is not None:
            return float(plan.estimate_days), False
        if plan.assumed_days is not None:
            return float(plan.assumed_days), True
        return None, False

    def child_epics(milestone: str) -> list[str]:
        return [c for c in children.get(milestone, []) if is_epic(c)]

    def epic_share(epic: str) -> float:
        if is_done(rows[epic]):
            return 1.0
        found = counts.get(epic, Counts())
        return found.closed / found.total if found.total else 0.0

    def build(ident: str, parent: str | None, number: str) -> WbsRow:
        row = rows[ident]
        kind = row.get("issue_type")
        status = _status(ident, row, snapshot)
        assignee_raw = row.get("assignee")
        handle = person_key(assignee_raw if isinstance(assignee_raw, str) else None)
        email = (
            assignee_raw.strip()
            if handle and isinstance(assignee_raw, str) and "@" in assignee_raw
            else handle
        )
        points = points_of(row.get("metadata"))
        estimate: float | None = None
        assumed = False
        start = end = finish = None
        percent: float | None = None
        if kind == "milestone":
            epics = child_epics(ident)
            pts = [points_of(rows[e].get("metadata")) for e in epics]
            total = sum(p for p in pts if p)
            points = total if any(pts) else None
            estimates = [epic_estimate(e)[0] for e in epics]
            estimate = (
                sum(v for v in estimates if v is not None)
                if any(v is not None for v in estimates)
                else None
            )
            start = _day(_metadata(row, "start"))
            end = _day(_metadata(row, "end"))
            finish = _day(entries[ident].finish) if ident in entries else None
            if total:
                percent = (
                    sum((p or 0) * epic_share(e) for p, e in zip(pts, epics, strict=True)) / total
                )
        elif kind == "epic":
            estimate, assumed = epic_estimate(ident)
            start, end = planned(ident)
            if is_done(row):
                finish = _day(row.get("closed_at"))
            else:
                item = forecast.get(ident)
                finish = _day(item.planned_end) if item else None
            percent = epic_share(ident)
        else:
            minutes = row.get("estimated_minutes")
            if isinstance(minutes, (int, float)) and not isinstance(minutes, bool) and minutes:
                estimate = minutes / WORKDAY_MINUTES
            percent = 1.0 if is_done(row) else 0.0
        blockers = list(dict.fromkeys(t for t, k in _deps(row) if k in BLOCKING))
        milestone = milestone_of(ident)
        return WbsRow(
            wbs=number,
            level=number.count(".") + 1,
            id=ident,
            parent_id=parent,
            milestone_title=str(rows[milestone].get("title", "")) if milestone else None,
            name=str(row.get("title", "")),
            issue_type=str(kind or ""),
            type_label=_type_label(row),
            status=status,
            blocked=status == "Blocked",
            assignee=handle or UNASSIGNED,
            assignee_email=email,
            points=points,
            estimate_days=estimate,
            estimate_assumed=assumed,
            planned_start=start,
            planned_end=end,
            forecast_end=finish,
            percent_done=percent,
            depends_on_wbs=[number_of.get(b, b) for b in blockers],
            depends_on_ids=blockers,
        )

    scope = (
        str(rows[milestone_id].get("title") or milestone_id)
        if milestone_id is not None and milestone_id in rows
        else milestone_id or "Project"
    )
    return WbsDocument(
        project=project,
        scope_label=scope,
        milestone_id=milestone_id,
        generated_at=generated_at,
        warning=warning,
        rows=[build(i, p, n) for i, p, n in flat],
    )
