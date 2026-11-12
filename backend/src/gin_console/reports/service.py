"""Report sections from the beads of one or more projects (spec REQ-REPORTS-002..006)."""

import statistics
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from datetime import UTC, date, datetime, timedelta
from typing import NamedTuple

from gin_console.reports.models import (
    AiUsage,
    BeadUsage,
    Coverage,
    CoverageBead,
    DeliverySection,
    EpicUsage,
    EstimateRow,
    Findings,
    MemberUsage,
    ModelRow,
    Point,
    ProjectError,
    Quality,
    QualityRow,
    QualitySection,
    Report,
    ReportBead,
    SourceIssue,
    StageRow,
    StageUsage,
    Stat,
    TimeRow,
    Tokens,
    Totals,
    UsageSection,
    WeekRow,
)

UNASSIGNED = "Unassigned"
TOP = 10
WORKDAY_MINUTES = 480  # gin-workflow workflow_core/milestone.py WORKDAY_MINUTES
STAGES = ("discuss", "plan", "orchestrate", "execute", "review", "verify", "ship", "quick")
DAY = 86400.0

Key = tuple[str, str]  # (project, bead id)


class Measured(NamedTuple):
    bead: ReportBead
    raw: AiUsage  # the bead's ai_usage as written
    own: AiUsage  # its own share (REQ-REPORTS-002)


def _key(bead: ReportBead) -> Key:
    return (bead.project, bead.id)


def member_of(bead: ReportBead) -> str:
    return bead.assignee or UNASSIGNED


def tokens_of(usage: AiUsage) -> int:
    return sum(t.total for t in usage.models.values())


def _cost(values: Iterable[float | None]) -> float | None:
    known = [v for v in values if v is not None]
    return round(sum(known), 6) if known else None


def _left(value: int, subtract: Iterable[int]) -> int:
    return max(value - sum(subtract), 0)


def _left_cost(value: float | None, subtract: Iterable[float | None]) -> float | None:
    return None if value is None else round(max(value - sum(v or 0.0 for v in subtract), 0.0), 6)


def _minus(a: Tokens, subs: list[Tokens]) -> Tokens:
    return Tokens(
        input=_left(a.input, (s.input for s in subs)),
        output=_left(a.output, (s.output for s in subs)),
        cache_read=_left(a.cache_read, (s.cache_read for s in subs)),
        cache_write=_left(a.cache_write, (s.cache_write for s in subs)),
        cost=_left_cost(a.cost, (s.cost for s in subs)),
    )


def _minus_quality(q: Quality, subs: list[Quality]) -> Quality:
    f = q.findings
    return Quality(
        reopens=_left(q.reopens, (s.reopens for s in subs)),
        bugs=_left(q.bugs, (s.bugs for s in subs)),
        review_cycles=_left(q.review_cycles, (s.review_cycles for s in subs)),
        rejections=_left(q.rejections, (s.rejections for s in subs)),
        waivers=_left(q.waivers, (s.waivers for s in subs)),
        findings=Findings(
            critical=_left(f.critical, (s.findings.critical for s in subs)),
            important=_left(f.important, (s.findings.important for s in subs)),
            minor=_left(f.minor, (s.findings.minor for s in subs)),
            suggestion=_left(f.suggestion, (s.findings.suggestion for s in subs)),
        ),
    )


def own_share(usage: AiUsage, children: list[AiUsage]) -> AiUsage:
    """An epic's usage minus its direct children's, never below 0 (gin-workflow collects an epic
    over {epic, *direct children}; `usage.report` counts only top-level summaries)."""
    if not children:
        return usage
    models = {
        m: _minus(t, [c.models[m] for c in children if m in c.models])
        for m, t in usage.models.items()
    }
    roles = {
        r: {
            m: _minus(t, [c.roles[r][m] for c in children if m in c.roles.get(r, {})])
            for m, t in per.items()
        }
        for r, per in usage.roles.items()
    }
    stages = {
        s: StageUsage(
            tokens=_left(v.tokens, (c.stages[s].tokens for c in children if s in c.stages)),
            cost=_left_cost(v.cost, (c.stages[s].cost for c in children if s in c.stages)),
        )
        for s, v in usage.stages.items()
    }
    quality = _minus_quality(usage.quality, [c.quality for c in children])
    return usage.model_copy(
        update={"models": models, "roles": roles, "stages": stages, "quality": quality}
    )


class _Tree:
    def __init__(self, beads: list[ReportBead]) -> None:
        self.index: dict[Key, ReportBead] = {_key(b): b for b in beads}
        self.children: dict[Key, list[ReportBead]] = defaultdict(list)
        for bead in beads:
            if bead.parent:
                self.children[(bead.project, bead.parent)].append(bead)

    def _lineage(self, bead: ReportBead) -> Iterable[ReportBead]:
        """The bead, then its ancestors; stops on a cycle or a parent outside the list."""
        seen: set[Key] = set()
        current: ReportBead | None = bead
        while current is not None and _key(current) not in seen:
            yield current
            seen.add(_key(current))
            parent = current.parent
            current = self.index.get((current.project, parent)) if parent else None

    def epics_of(self, bead: ReportBead) -> list[ReportBead]:
        """Every epic in the bead's lineage: itself when it is one, then its epic ancestors."""
        return [b for b in self._lineage(bead) if b.issue_type == "epic"]

    def under(self, bead: ReportBead, roots: set[Key]) -> bool:
        return any(_key(b) in roots for b in self._lineage(bead))

    def own(self, bead: ReportBead) -> AiUsage | None:
        if bead.usage is None or bead.issue_type != "epic":
            return bead.usage
        kids = [c.usage for c in self.children.get(_key(bead), []) if c.usage is not None]
        return own_share(bead.usage, kids)


def _closed_at(bead: ReportBead) -> datetime:
    assert bead.closed_at is not None  # only closed beads with closed_at are selected
    return bead.closed_at


def _rate(qualities: list[Quality]) -> float | None:
    if not qualities:
        return None
    return round(sum(1 for q in qualities if q.reopens > 0 or q.bugs > 0) / len(qualities), 4)


def _stat(values: list[float]) -> Stat | None:
    if not values:
        return None
    ordered = sorted(values)
    p85 = (
        ordered[0]
        if len(ordered) == 1
        else statistics.quantiles(ordered, n=100, method="inclusive")[84]
    )
    return Stat(n=len(ordered), median=round(statistics.median(ordered), 2), p85=round(p85, 2))


def _span(start: datetime | None, end: datetime | None) -> float | None:
    if start is None or end is None or end < start:
        return None
    return (end - start).total_seconds() / DAY


def _week(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def _weeks(first: date, last: date) -> list[str]:
    weeks: list[str] = []
    monday = first - timedelta(days=first.weekday())
    while monday <= last:
        weeks.append(_week(monday))
        monday += timedelta(days=7)
    return weeks


def _weekdays(first: date, last: date) -> int:
    return sum(
        1 for n in range((last - first).days + 1) if (first + timedelta(days=n)).weekday() < 5
    )


def _stage_order(stage: str) -> tuple[int, str]:
    return (STAGES.index(stage), "") if stage in STAGES else (len(STAGES), stage)


def _cache_ratio(models: list[Tokens]) -> float | None:
    read_side = sum(t.input + t.cache_read + t.cache_write for t in models)
    return round(sum(t.cache_read for t in models) / read_side, 4) if read_side else None


def _totals(closed: list[ReportBead], measured: list[Measured]) -> Totals:
    tokens = sum(tokens_of(m.own) for m in measured)
    return Totals(
        tokens=tokens,
        cost=_cost(t.cost for m in measured for t in m.own.models.values()),
        closed=len(closed),
        tokens_per_bead=round(tokens / len(measured), 1) if measured else None,
        cache_ratio=_cache_ratio([t for m in measured for t in m.own.models.values()]),
        rework_rate=_rate([m.own.quality for m in measured]),
    )


def _member_usage(name: str, closed: list[ReportBead], rows: list[Measured]) -> MemberUsage:
    tokens = sum(tokens_of(m.own) for m in rows)
    models = [t for m in rows for t in m.own.models.values()]
    stages: dict[str, int] = defaultdict(int)
    for m in rows:
        for stage, value in m.own.stages.items():
            stages[stage] += value.tokens
    return MemberUsage(
        member=name,
        closed=sum(1 for b in closed if member_of(b) == name),
        tokens=tokens,
        cost=_cost(t.cost for t in models),
        tokens_per_bead=round(tokens / len(rows), 1) if rows else None,
        cache_ratio=_cache_ratio(models),
        stages=dict(stages),
    )


def _by_epic(tree: _Tree, measured: list[Measured]) -> dict[Key, list[Measured]]:
    groups: dict[Key, list[Measured]] = defaultdict(list)
    for m in measured:
        for epic in tree.epics_of(m.bead):
            groups[_key(epic)].append(m)
    return groups


def _usage(tree: _Tree, closed: list[ReportBead], measured: list[Measured]) -> UsageSection:
    members = [
        _member_usage(name, closed, [m for m in measured if member_of(m.bead) == name])
        for name in {member_of(b) for b in closed}
    ]
    members.sort(key=lambda r: (-r.tokens, r.member))
    epics: list[EpicUsage] = []
    for key, rows in _by_epic(tree, measured).items():
        epic = tree.index[key]
        kids = tree.children.get(key, [])
        epics.append(
            EpicUsage(
                project=epic.project,
                id=epic.id,
                title=epic.title,
                status=epic.status,
                tokens=sum(tokens_of(m.own) for m in rows),
                cost=_cost(t.cost for m in rows for t in m.own.models.values()),
                children=len(kids),
                closed_children=sum(1 for k in kids if k.status == "closed"),
                budget=epic.usage.budget if epic.usage is not None else None,
            )
        )
    epics.sort(key=lambda r: (-r.tokens, r.project, r.id))
    beads = [
        BeadUsage(
            project=m.bead.project,
            id=m.bead.id,
            title=m.bead.title,
            issue_type=m.bead.issue_type,
            assignee=m.bead.assignee,
            tokens=tokens_of(m.own),
            cost=_cost(t.cost for t in m.own.models.values()),
        )
        for m in measured
    ]
    beads.sort(key=lambda r: (-r.tokens, r.project, r.id))
    stage_tokens: dict[str, int] = defaultdict(int)
    stage_costs: dict[str, list[float | None]] = defaultdict(list)
    model_rows: dict[tuple[str, str], list[Tokens]] = defaultdict(list)
    for m in measured:
        for stage, value in m.own.stages.items():
            stage_tokens[stage] += value.tokens
            stage_costs[stage].append(value.cost)
        for role, per in m.own.roles.items():
            for model, tokens in per.items():
                model_rows[(role, model)].append(tokens)
    stages = [
        StageRow(stage=s, tokens=stage_tokens[s], cost=_cost(stage_costs[s]))
        for s in sorted(stage_tokens, key=_stage_order)
    ]
    models = [
        ModelRow(
            model=model,
            role=role,
            input=sum(t.input for t in items),
            output=sum(t.output for t in items),
            cache_read=sum(t.cache_read for t in items),
            cache_write=sum(t.cache_write for t in items),
            tokens=sum(t.total for t in items),
            cost=_cost(t.cost for t in items),
        )
        for (role, model), items in model_rows.items()
    ]
    models.sort(key=lambda r: (-r.tokens, r.model, r.role))
    return UsageSection(
        members=members, epics=epics[:TOP], beads=beads[:TOP], stages=stages, models=models
    )


def _times(closed: list[ReportBead], key: Callable[[ReportBead], str]) -> list[TimeRow]:
    cycle: dict[str, list[float]] = defaultdict(list)
    lead: dict[str, list[float]] = defaultdict(list)
    for bead in closed:
        if (days := _span(bead.started_at, bead.closed_at)) is not None:
            cycle[key(bead)].append(days)
        if (days := _span(bead.created_at, bead.closed_at)) is not None:
            lead[key(bead)].append(days)
    return [
        TimeRow(key=k, cycle=_stat(cycle.get(k, [])), lead=_stat(lead.get(k, [])))
        for k in sorted({key(b) for b in closed})
    ]


def _delivery(
    closed: list[ReportBead], now: datetime, days: int, sprint: str | None
) -> DeliverySection:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for bead in closed:
        counts[_week(_closed_at(bead).astimezone(UTC).date())][bead.issue_type] += 1
    if sprint is None:
        weeks = _weeks(
            (now - timedelta(days=days)).astimezone(UTC).date(), now.astimezone(UTC).date()
        )
    else:
        dates = [_closed_at(b).astimezone(UTC).date() for b in closed]
        weeks = _weeks(min(dates), max(dates)) if dates else []
    estimates = [
        EstimateRow(
            project=b.project,
            id=b.id,
            title=b.title,
            estimate_days=round(b.estimated_minutes / WORKDAY_MINUTES, 1),
            actual_days=_weekdays((b.started_at or b.created_at).date(), _closed_at(b).date()),
        )
        for b in closed
        if b.issue_type == "epic" and b.estimated_minutes
    ]
    return DeliverySection(
        weeks=[WeekRow(week=w, counts=dict(counts.get(w, Counter()))) for w in weeks],
        by_type=_times(closed, lambda b: b.issue_type),
        by_member=_times(closed, member_of),
        overall=(_times(closed, lambda _: "all") or [TimeRow(key="all", cycle=None, lead=None)])[0],
        estimates=estimates,
    )


def _quality_row(
    key: str, project: str | None, title: str | None, rows: list[Measured]
) -> QualityRow:
    qs = [m.own.quality for m in rows]
    return QualityRow(
        key=key,
        project=project,
        title=title,
        beads=len(qs),
        reopens=sum(q.reopens for q in qs),
        bugs=sum(q.bugs for q in qs),
        review_cycles=sum(q.review_cycles for q in qs),
        rejections=sum(q.rejections for q in qs),
        waivers=sum(q.waivers for q in qs),
        findings=Findings(
            critical=sum(q.findings.critical for q in qs),
            important=sum(q.findings.important for q in qs),
            minor=sum(q.findings.minor for q in qs),
            suggestion=sum(q.findings.suggestion for q in qs),
        ),
        rework_rate=_rate(qs),
    )


def _quality(tree: _Tree, measured: list[Measured]) -> QualitySection:
    members = [
        _quality_row(name, None, None, [m for m in measured if member_of(m.bead) == name])
        for name in sorted({member_of(m.bead) for m in measured})
    ]
    epics = [
        _quality_row(key[1], key[0], tree.index[key].title, rows)
        for key, rows in sorted(_by_epic(tree, measured).items())
    ]
    points = [
        Point(
            project=m.bead.project,
            id=m.bead.id,
            title=m.bead.title,
            tokens=tokens_of(m.own),
            rework=m.own.quality.reopens + m.own.quality.bugs + m.own.quality.rejections,
        )
        for m in measured
        if m.bead.issue_type != "epic"
    ]
    return QualitySection(members=members, epics=epics, points=points)


def _coverage(
    closed: list[ReportBead], selected: list[ReportBead], measured: list[Measured]
) -> Coverage:
    total = sum(tokens_of(m.own) for m in measured)
    unassigned = sum(tokens_of(m.own) for m in measured if member_of(m.bead) == UNASSIGNED)
    return Coverage(
        not_collected=[
            CoverageBead(
                project=b.project,
                id=b.id,
                title=b.title,
                detail=f"gin usage collect --bead {b.id}",
            )
            for b in closed
            if b.usage is None and b.usage_problem is None
        ],
        invalid=[
            CoverageBead(project=b.project, id=b.id, title=b.title, detail=b.usage_problem)
            for b in selected
            if b.usage_problem is not None
        ],
        unpriced=sorted({name for m in measured for name in m.raw.unpriced}),
        unassigned_share=round(unassigned / total, 4) if total else None,
        sources=[
            SourceIssue(
                project=m.bead.project,
                id=m.bead.id,
                title=m.bead.title,
                sources=m.raw.sources,
                skipped_lines=m.raw.skipped_lines,
            )
            for m in measured
            if m.raw.skipped_lines > 0 or any(v != "ok" for v in m.raw.sources.values())
        ],
    )


def build_report(
    beads: list[ReportBead],
    *,
    now: datetime,
    project: str,
    days: int,
    sprint: str | None,
    errors: list[ProjectError],
) -> Report:
    tree = _Tree(beads)
    if sprint is None:
        scope = beads
        since = now - timedelta(days=days)
        closed = [
            b
            for b in beads
            if b.status == "closed" and b.closed_at is not None and b.closed_at >= since
        ]
    else:
        roots = {
            _key(b) for b in beads if b.issue_type == "epic" and f"sprint:{sprint}" in b.labels
        }
        scope = [b for b in beads if tree.under(b, roots)]
        closed = [b for b in scope if b.status == "closed" and b.closed_at is not None]
    closed.sort(key=_key)
    measured = [
        Measured(b, b.usage, own)
        for b in closed
        if b.usage is not None and (own := tree.own(b)) is not None
    ]
    return Report(
        generated_at=now,
        project=project,
        days=days,
        sprint=sprint,
        totals=_totals(closed, measured),
        usage=_usage(tree, closed, measured),
        delivery=_delivery(closed, now, days, sprint),
        quality=_quality(tree, measured),
        coverage=_coverage(closed, scope if sprint is not None else closed, measured),
        errors=errors,
    )
