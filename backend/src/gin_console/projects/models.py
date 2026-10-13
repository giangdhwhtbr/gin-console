from pydantic import BaseModel


class BlockError(BaseModel):
    error: str


class Workflow(BaseModel):
    stage: str
    layout: str
    gates: dict[str, str]


class Epic(BaseModel):
    id: str
    title: str


class Beads(BaseModel):
    open: int
    in_progress: int
    blocked: int
    ready: int
    epics: list[Epic]


class Project(BaseModel):
    name: str
    path: str
    scotty_id: str | None
    scotty_url: str | None
    exists: bool
    workflow: Workflow | BlockError | None
    beads: Beads | BlockError | None
