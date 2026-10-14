from datetime import datetime

from pydantic import BaseModel


class SessionSummary(BaseModel):
    id: str
    project: str
    title: str
    cwd: str | None
    modified: datetime
    size: int
    live: bool
    name: str | None = None
    status: str | None = None
    kind: str | None = None
    resume_command: str
