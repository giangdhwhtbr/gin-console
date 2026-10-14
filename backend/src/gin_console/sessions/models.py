from datetime import datetime
from typing import Literal

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


class Block(BaseModel):
    type: Literal["text", "thinking", "tool_use", "tool_result"]
    text: str | None = None
    name: str | None = None
    input: str | None = None
    truncated: bool = False


class Message(BaseModel):
    role: Literal["user", "assistant"]
    blocks: list[Block]


class MessagePage(BaseModel):
    items: list[Message]
    next_offset: int | None
