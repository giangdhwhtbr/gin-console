from pydantic import BaseModel


class Project(BaseModel):
    name: str
    path: str
    scotty_id: str | None
    exists: bool
