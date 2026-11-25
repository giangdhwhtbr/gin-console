from datetime import datetime

from pydantic import BaseModel, Field

from gin_console.reports.models import Blocker


class BlockedBead(BaseModel):
    id: str
    title: str
    assignee: str | None
    days: int
    blocker: Blocker | None


class AgingBead(BaseModel):
    id: str
    title: str
    assignee: str | None
    days: int


class ReadyBead(BaseModel):
    id: str
    title: str
    priority: int | None


class ActiveBead(BaseModel):
    id: str
    title: str
    assignee: str | None


class Named(BaseModel):
    id: str
    title: str


class ProjectOverview(BaseModel):
    name: str
    error: str | None = None
    stale: bool = False
    milestone: Named | None = None
    blocked: list[BlockedBead] = Field(default_factory=list)
    aging: list[AgingBead] = Field(default_factory=list)
    unassigned: list[ReadyBead] = Field(default_factory=list)
    in_progress: list[ActiveBead] = Field(default_factory=list)
    epics: list[Named] = Field(default_factory=list)


class Overview(BaseModel):
    generated_at: datetime
    aging_days: int
    projects: list[ProjectOverview]
