from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class BlockError(BaseModel):
    error: str


class WorkspaceRepo(BaseModel):
    path: str
    branch: str | None = None
    shape: str | None = None
    frozen: bool = False
    present: bool = True


class Workspace(BaseModel):
    root: str
    repos: list[WorkspaceRepo] = []


class Team(BaseModel):
    enabled: bool = False
    host: str | None = None
    me: str | None = None


class ReviewWaiver(BaseModel):
    task_id: str
    reason: str = ""
    actor: str = ""


class Workflow(BaseModel):
    stage: str
    layout: str
    gates: dict[str, str]
    workspace: Workspace | None = None
    team: Team | None = None
    decision: str | None = None
    warnings: list[str] = []
    remedies: list[str] = []
    review_waivers: list[ReviewWaiver] = []


class EpicWorkflow(BaseModel):
    stage: str
    gates: dict[str, str]
    warnings: list[str] = []
    review_waivers: list[ReviewWaiver] = []


class Epic(BaseModel):
    id: str
    title: str
    status: str
    workflow: EpicWorkflow | BlockError | None = None


class Beads(BaseModel):
    open: int
    in_progress: int
    blocked: int
    ready: int
    prep: int = 0
    epics: list[Epic]
    stale: bool = False


class PullResult(BaseModel):
    """The last `bd dolt pull` of a project (REQ-BEADS-016); `at` is when it ended."""

    at: datetime
    status: Literal["ok", "no_remote", "error"]
    error: str | None = None


class Project(BaseModel):
    name: str
    path: str
    exists: bool
    workflow: Workflow | BlockError | None
    beads: Beads | BlockError | None
    pull: PullResult | None = None


class ProjectBeads(BaseModel):
    name: str
    path: str
    exists: bool
    beads: Beads | BlockError | None
    pull: PullResult | None = None
