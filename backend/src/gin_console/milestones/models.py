"""
`gin milestone list|show --json`, schema 1, as the console serves it;
`forecast` and `lanes` are null from a gin-workflow before
milestone-forecast.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, StringConstraints

from gin_console.beads.models import Text

# the frontend does day arithmetic on these: anything else is refused at the boundary
IsoDate = Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]


class EpicCount(BaseModel):
    total: int
    closed: int


class DaysPerPoint(BaseModel):
    value: float
    measured_epics: int = 0
    assumed: bool = False


class Velocity(BaseModel):
    committed_points: int | None = None
    completed_points: int = 0
    added_points: int = 0
    say_do: float | None = None
    days_per_point: float | None = None
    planned_days_per_point: float | None = None
    accuracy: float | None = None


class MilestoneEntry(BaseModel):
    id: Text
    title: Text
    status: Text
    start: IsoDate | None
    end: IsoDate | None
    kickoff: IsoDate | None
    finish: IsoDate | None
    epics: EpicCount
    warnings: int | None
    error: Text | None
    lanes: int | None = None
    velocity: Velocity | None = None


class Forecast(BaseModel):
    deadline: IsoDate | None
    lanes: int
    start: IsoDate
    finish: IsoDate | None
    overflow_days: int
    open_epics: int
    unestimated: int
    error: Text | None


class MilestoneList(BaseModel):
    milestones: list[MilestoneEntry]
    unassigned_epics: int
    today: IsoDate
    forecast: Forecast | None = None
    days_per_point: DaysPerPoint | None = None


class EpicWarning(BaseModel):
    code: Text
    days: int | None = None
    count: int | None = None


class ExternalDependency(BaseModel):
    id: Text
    milestone: Text | None


class EpicPlan(BaseModel):
    id: Text
    title: Text
    status: Text
    estimate_days: int | None
    planned_start: IsoDate
    planned_end: IsoDate
    depends_on: list[Text]
    external_depends_on: list[ExternalDependency]
    warnings: list[EpicWarning]
    spec_confirmed: bool | None = None
    remaining_days: int | None = None
    assumed_days: int | None = None
    points: int | None = None
    points_reason: Text | None = None
    estimate_source: Literal["points", "days", "assumed"] | None = None
    actual_days: int | None = None
    actual_days_per_point: float | None = None


class MilestoneDetail(BaseModel):
    id: Text
    title: Text
    description: Text
    status: Text
    start: IsoDate
    end: IsoDate
    kickoff: IsoDate | None
    schedule_start: IsoDate
    preview: bool
    today: IsoDate
    finish: IsoDate | None
    overflow_days: int
    epics: list[EpicPlan]
    lanes: int | None = None
    integration: IsoDate | None = None
    deadline: IsoDate | None = None
    away: dict[str, list[Text]] = {}
    days_per_point: DaysPerPoint | None = None
    velocity: Velocity | None = None
