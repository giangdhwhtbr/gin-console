from typing import Any, Literal

from pydantic import BaseModel, Field

State = Literal["living", "proposed", "removed"]
Status = Literal["failing", "building", "unknown", "covered", "untested"]
SignoffState = Literal["none", "waived", "current", "changed", "unknown version"]
Cause = Literal["outdated", "schema"]


class TraceSignoff(BaseModel):
    at: str | None = None
    actor: str | None = None
    evidence: str | None = None
    source: str | None = None
    waived: bool = False
    change: str | None = None
    current: bool | None = None


class TraceChange(BaseModel):
    change: str
    epic: str | None = None
    op: str
    archived: str | None = None
    signoff: TraceSignoff | None = None


class BeadRef(BaseModel):
    id: str
    title: str
    status: str


class CaseRef(BaseModel):
    id: str
    effective_result: str


class TraceRequirement(BaseModel):
    id: str
    title: str
    capability: str
    state: State
    source: str | None = None
    changes: list[TraceChange] = Field(default_factory=list)
    signoff: TraceSignoff | None = None
    beads: list[BeadRef] | None = None
    cases: list[CaseRef] | None = None
    tests: list[str] = Field(default_factory=list)


class Trace(BaseModel):
    layout: str
    requirements: list[TraceRequirement]
    warnings: list[str] = Field(default_factory=list)
    skipped: list[Any] = Field(default_factory=list)


class Signoff(BaseModel):
    state: SignoffState
    actor: str | None = None
    at: str | None = None
    change: str | None = None
    evidence: str | None = None
    source: str | None = None


class ChangeRef(BaseModel):
    folder: str  # <archived>-<change>, or <change> while open
    change: str
    epic: str | None
    op: str
    archived: str | None


class RequirementRow(BaseModel):
    id: str
    title: str
    capability: str
    state: State
    status: Status | None
    reasons: list[str]
    signoff: Signoff
    changes: list[ChangeRef]
    beads: list[BeadRef] | None
    cases: list[CaseRef] | None
    tests: list[str]


class RequirementList(BaseModel):
    layout: str
    requirements: list[RequirementRow]
    warnings: list[str]
    skipped: list[str]


class Scenario(BaseModel):
    title: str
    given: list[str] = Field(default_factory=list)
    when: list[str] = Field(default_factory=list)
    then: list[str] = Field(default_factory=list)


class ReqEntry(BaseModel):
    id: str
    title: str
    source: str | None = None
    section: str = ""
    scenarios: list[Scenario] = Field(default_factory=list)


class Reqs(BaseModel):
    requirements: list[ReqEntry]


class RequirementScenarios(BaseModel):
    id: str
    title: str
    source: str | None
    scenarios: list[Scenario]


class ChangeFolder(BaseModel):
    folder: str
    change: str
    title: str
    epic: str | None
    archived: str | None


class ChangeRow(ChangeFolder):
    signoff: Signoff | None  # null: the trace does not name the change, or failed
    added: int | None
    modified: int | None
    removed: int | None


class ChangeList(BaseModel):
    changes: list[ChangeRow]
    error: str | None
    cause: Cause | None


class ChangeContent(ChangeFolder):
    files: dict[str, str]  # proposal, spec-delta, design, plan, tests


class Mockup(BaseModel):
    capability: str
    date: str
    confirmed: str
    confirmed_by: str | None
    description: str
    html: list[str]
    images: list[str]
    requirements: list[str]


class MockupList(BaseModel):
    mockups: list[Mockup]
