"""The report of GET /api/reports and the beads it is built from."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from gin_console.beads.models import ChildCounts


class MilestoneMove(BaseModel):
    """An entry of `metadata.milestone_moves` (REQ-REPORTS-021)."""

    day: date
    source: str | None = None
    target: str | None = None


class PointsChange(BaseModel):
    """An entry of `metadata.points_history` (REQ-REPORTS-021)."""

    day: date
    before: int | None = None
    after: int | None = None


class ReportBead(BaseModel):
    project: str
    id: str
    title: str
    issue_type: str
    status: str
    assignee: str | None = None
    parent: str | None = None
    labels: list[str] = Field(default_factory=list)
    blocked: bool = False
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    closed_at: datetime | None = None
    estimated_minutes: int | None = None
    points: int | None = None
    priority: int | None = None
    start: str | None = None  # milestone rows only: metadata.start as written
    end: str | None = None
    kickoff: str | None = None
    reopens: int = 0
    reopened_on: list[date] = Field(default_factory=list)
    bugs: int = 0
    bug_days: list[date] = Field(default_factory=list)
    moves: list[MilestoneMove] = Field(default_factory=list)
    points_history: list[PointsChange] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    blocked_since: datetime | None = None
    child_counts: ChildCounts | None = None
    planned_days_per_point: float | None = None  # milestone rows only


class Totals(BaseModel):
    closed: int
    rework_rate: float | None


class Stat(BaseModel):
    n: int
    median: float
    p85: float


class TimeRow(BaseModel):
    key: str
    cycle: Stat | None
    lead: Stat | None


class WeekRow(BaseModel):
    week: str
    counts: dict[str, int]


class EstimateRow(BaseModel):
    project: str
    id: str
    title: str
    estimate_days: float | None
    points: int | None = None
    actual_days: int
    days_per_point: float | None = None


class DeliverySection(BaseModel):
    weeks: list[WeekRow]
    by_type: list[TimeRow]
    by_member: list[TimeRow]
    overall: TimeRow
    estimates: list[EstimateRow]


class QualityRow(BaseModel):
    member: str
    closed: int
    reopens: int
    bugs: int
    rework_rate: float | None


class EpicQuality(BaseModel):
    project: str
    id: str
    title: str
    closed: int
    reopens: int
    bugs: int
    rework_rate: float | None


class QualitySection(BaseModel):
    members: list[QualityRow]
    epics: list[EpicQuality]


class Report(BaseModel):
    generated_at: datetime
    project: str
    days: int
    sprint: str | None
    totals: Totals
    delivery: DeliverySection
    quality: QualitySection


BeadBucket = Literal["open", "in_progress", "closed"]
MilestoneStatus = Literal["active", "scheduled", "planned", "closed"]


class TeamMilestone(BaseModel):
    id: str
    title: str
    status: MilestoneStatus
    start: date
    end: date
    closed_on: date | None


class TeamEpic(BaseModel):
    id: str
    title: str


class TeamBead(BaseModel):
    id: str
    title: str
    issue_type: str
    status: str
    bucket: BeadBucket
    blocked: bool
    assignee: str | None
    priority: int | None
    created_at: datetime
    epic: TeamEpic
    started_at: datetime | None
    closed_at: datetime | None
    cycle_days: float | None
    age_days: float | None  # in_progress only
    late_days: int | None  # closed only
    rework: int  # reopens + bugs found later; 0 when none


class TeamFigures(BaseModel):
    scope: int
    closed: int
    in_progress: int
    open: int
    blocked: int
    unclaimed: int
    done: float | None
    throughput: float
    cycle_median: float | None
    oldest_in_progress: float | None
    on_time: float | None
    rework_rate: float | None
    reopens: int
    bugs: int


class MemberFigures(TeamFigures):
    member: str


class TeamTotals(TeamFigures):
    working_days: int
    elapsed: int
    days_left: int
    pace: float
    pace_needed: float | None
    late_open: int


class DayRow(BaseModel):
    date: date
    closed: dict[str, int]  # member -> beads closed that working day; zero counts left out


class TeamReport(BaseModel):
    generated_at: datetime
    project: str
    today: date
    milestones: list[TeamMilestone]
    undated: int
    milestone: str | None
    team: TeamTotals | None
    members: list[MemberFigures]
    days: list[DayRow]
    beads: list[TeamBead]
