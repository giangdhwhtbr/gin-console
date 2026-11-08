"""
`gin-workflow milestone list|show --json`, schema 1, as the console serves it;
`forecast` and `lanes` are null from a gin-workflow before
milestone-forecast.
"""

from typing import Annotated

from pydantic import BaseModel, StringConstraints

from gin_console.beads.models import Text

# the frontend does day arithmetic on these: anything else is refused at the boundary
IsoDate = Annotated[str, StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$")]


class EpicCount(BaseModel):
    total: int
    closed: int


class MilestoneEntry(BaseModel):
    id: Text
    title: Text
    status: Text
    start: IsoDate
    end: IsoDate
    kickoff: IsoDate | None
    finish: IsoDate | None
    epics: EpicCount
    warnings: int | None
    error: Text | None
    lanes: int | None = None


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


class EpicWarning(BaseModel):
    code: Text
    days: int | None = None


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
