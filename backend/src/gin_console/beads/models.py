from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict

from gin_console.beads.kinds import Complexity, Kind
from gin_console.quota.source import clean

# lone surrogates are valid JSON escapes but cannot be encoded in a response
Text = Annotated[str, AfterValidator(clean)]


class TrackRef(BaseModel):
    model_config = ConfigDict(strict=True)

    plan: Text | None
    number: int


class GateRef(BaseModel):
    model_config = ConfigDict(strict=True)

    plan: Text
    number: int
    track_id: Text | None = None
    lane: Text | None = None


class Claim(BaseModel):
    model_config = ConfigDict(strict=True)

    holder: Text
    expires_at: datetime


class BeadSummary(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    priority: int
    issue_type: Text
    labels: list[Text] = []
    owner: Text | None = None
    assignee: Text | None = None
    parent: Text | None = None
    created_at: Text
    updated_at: Text
    dependency_count: int = 0
    dependent_count: int = 0
    comment_count: int = 0
    closed_at: Text | None = None
    ready: bool = False
    blocked: bool = False
    created_by: Text | None = None
    blocked_by: list[Text] = []
    milestone: Text | None = None
    kind: Kind | None = None
    capabilities: list[Text] = []
    complexity: Complexity | None = None
    points: int | None = None
    points_reason: Text | None = None
    estimate_minutes: int | None = None
    lane: Text | None = None
    track: TrackRef | None = None
    claim: Claim | None = None
    waits_for: GateRef | None = None


class Relation(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    type: Literal["blocks", "parent-child", "discovered-from"]


class GateRelation(Relation):
    """A dependency or dependent: it says what a merge gate waits for (REQ-BEADS-019)."""

    waits_for: GateRef | None = None


class ChildRelation(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Text
    type: Literal["parent-child"]
    prep: bool = False
    waits_for: GateRef | None = None


class Comment(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    author: Text
    text: Text
    created_at: Text
    truncated: bool = False


class BeadDetail(BeadSummary):
    description: Text | None = None
    design: Text | None = None
    notes: Text | None = None
    acceptance_criteria: Text | None = None
    close_reason: Text | None = None
    dependencies: list[GateRelation] = []
    dependents: list[GateRelation] = []
    children: list[ChildRelation] = []
    bugs: list[Relation] = []


class MilestoneOption(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    title: Text
    status: Literal["active", "scheduled", "planned", "closed"]
    start: date | None
    end: date | None


class ProjectMilestones(BaseModel):
    milestones: list[MilestoneOption]
    current: Text | None
