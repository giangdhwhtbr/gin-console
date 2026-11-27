from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class BlockError(BaseModel):
    error: str


class ReviewWaiver(BaseModel):
    task_id: str
    reason: str = ""
    actor: str = ""


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


class FetchResult(BaseModel):
    """The last fetch of the shared attachment store of a project (REQ-BEADS-033)."""

    at: datetime
    status: Literal["ok", "no_store", "no_remote", "error"]
    error: str | None = None


class ProjectBeads(BaseModel):
    name: str
    path: str
    exists: bool
    beads: Beads | BlockError | None
    pull: PullResult | None = None
    attachments_fetch: FetchResult | None = None
