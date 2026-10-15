from datetime import datetime

from pydantic import BaseModel


class QuotaError(BaseModel):
    error: str
    raw: str | None = None


class ClaudeWindow(BaseModel):
    label: str
    used_percent: float
    resets_at: datetime


class ClaudeQuota(BaseModel):
    windows: list[ClaudeWindow]
    fetched_at: datetime


class CodexWindow(BaseModel):
    used_percent: float
    window_minutes: int | None
    resets_at: datetime | None


class CodexQuota(BaseModel):
    plan_type: str | None
    ordinary_usage_allowed: bool | None
    rate_limit_reached_type: str | None
    reset_credits_available: int
    primary: CodexWindow | None
    secondary: CodexWindow | None
    fetched_at: datetime


class Quota(BaseModel):
    claude: ClaudeQuota | QuotaError
    codex: CodexQuota | QuotaError
