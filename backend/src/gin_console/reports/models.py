"""The report of GET /api/reports and the parsed `ai_usage` it is built from."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class Tokens(BaseModel):
    input: int = 0
    output: int = 0
    cache_read: int = 0
    cache_write: int = 0
    cost: float | None = None

    @property
    def total(self) -> int:
        return self.input + self.output + self.cache_read + self.cache_write


class StageUsage(BaseModel):
    tokens: int = 0
    cost: float | None = None


class Findings(BaseModel):
    critical: int = 0
    important: int = 0
    minor: int = 0
    suggestion: int = 0


class Quality(BaseModel):
    reopens: int = 0
    bugs: int = 0
    review_cycles: int = 0
    rejections: int = 0
    waivers: int = 0
    findings: Findings = Field(default_factory=Findings)


class Budget(BaseModel):
    budget_usd: float
    cost: float | None = None
    status: str


class AiUsage(BaseModel):
    """`metadata.ai_usage` version 1, as gin-workflow `usage collect` writes it."""

    version: int
    models: dict[str, Tokens] = Field(default_factory=dict)
    roles: dict[str, dict[str, Tokens]] = Field(default_factory=dict)
    stages: dict[str, StageUsage] = Field(default_factory=dict)
    quality: Quality = Field(default_factory=Quality)
    unpriced: list[str] = Field(default_factory=list)
    sources: dict[str, str] = Field(default_factory=dict)
    skipped_lines: int = 0
    budget: Budget | None = None


class ReportBead(BaseModel):
    project: str
    id: str
    title: str
    issue_type: str
    status: str
    assignee: str | None = None
    parent: str | None = None
    labels: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None = None
    closed_at: datetime | None = None
    estimated_minutes: int | None = None
    priority: int | None = None
    start: str | None = None  # milestone rows only: metadata.start as written
    end: str | None = None
    kickoff: str | None = None
    usage: AiUsage | None = None
    usage_problem: str | None = (
        None  # "unreadable" or "version N"; None when usage is fine or absent
    )


class Totals(BaseModel):
    tokens: int
    cost: float | None
    closed: int
    tokens_per_bead: float | None
    cache_ratio: float | None
    rework_rate: float | None


class MemberUsage(BaseModel):
    member: str
    closed: int
    tokens: int
    cost: float | None
    tokens_per_bead: float | None
    cache_ratio: float | None
    stages: dict[str, int]


class EpicUsage(BaseModel):
    project: str
    id: str
    title: str
    status: str
    tokens: int
    cost: float | None
    children: int
    closed_children: int
    budget: Budget | None


class BeadUsage(BaseModel):
    project: str
    id: str
    title: str
    issue_type: str
    assignee: str | None
    tokens: int
    cost: float | None


class StageRow(BaseModel):
    stage: str
    tokens: int
    cost: float | None


class ModelRow(BaseModel):
    model: str
    role: str
    input: int
    output: int
    cache_read: int
    cache_write: int
    tokens: int
    cost: float | None


class UsageSection(BaseModel):
    members: list[MemberUsage]
    epics: list[EpicUsage]
    beads: list[BeadUsage]
    stages: list[StageRow]
    models: list[ModelRow]


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
    estimate_days: float
    actual_days: int


class DeliverySection(BaseModel):
    weeks: list[WeekRow]
    by_type: list[TimeRow]
    by_member: list[TimeRow]
    overall: TimeRow
    estimates: list[EstimateRow]


class QualityRow(BaseModel):
    key: str
    project: str | None
    title: str | None
    beads: int
    reopens: int
    bugs: int
    review_cycles: int
    rejections: int
    waivers: int
    findings: Findings
    rework_rate: float | None


class Point(BaseModel):
    project: str
    id: str
    title: str
    tokens: int
    rework: int


class QualitySection(BaseModel):
    members: list[QualityRow]
    epics: list[QualityRow]
    points: list[Point]


class CoverageBead(BaseModel):
    project: str
    id: str
    title: str
    detail: str


class SourceIssue(BaseModel):
    project: str
    id: str
    title: str
    sources: dict[str, str]
    skipped_lines: int


class Coverage(BaseModel):
    not_collected: list[CoverageBead]
    invalid: list[CoverageBead]
    unpriced: list[str]
    unassigned_share: float | None
    sources: list[SourceIssue]


class ProjectError(BaseModel):
    project: str
    error: str


class Report(BaseModel):
    generated_at: datetime
    project: str
    days: int
    sprint: str | None
    totals: Totals
    usage: UsageSection
    delivery: DeliverySection
    quality: QualitySection
    coverage: Coverage
    errors: list[ProjectError]


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
    assignee: str | None
    priority: int | None
    created_at: datetime
    epic: TeamEpic
    started_at: datetime | None
    closed_at: datetime | None
    cycle_days: float | None
    age_days: float | None  # in_progress only
    late_days: int | None  # closed only
    rework: int | None  # own reopens + bugs; None without readable ai_usage


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
