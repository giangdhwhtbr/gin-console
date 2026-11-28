from datetime import UTC, date, datetime
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from gin_console.reports.models import EpicRef

Cause = Literal["missing", "outdated"]
RunReason = Literal["no_run", "not_on_host", "invalid"]
ItemKey = Literal["cases", "results", "bugs", "gates"]
ItemState = Literal["pass", "fail", "unknown"]
Verdict = Literal["ready", "not_ready", "unknown"]


# what `gin-qa cases export --format json` prints, only the keys the console uses (REQ-QA-001)
class ExportReq(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str


class ExportCase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    capability: str
    type: str
    priority: str = ""
    result: str
    effective_result: str
    run: str = ""
    bug: str = ""
    file: str
    reqs: list[ExportReq] = Field(default_factory=list)
    preconditions: list[Any] = Field(default_factory=list)
    steps: list[Any] = Field(default_factory=list)
    expected: list[Any] = Field(default_factory=list)


class CaseExport(BaseModel):
    model_config = ConfigDict(extra="ignore")

    cases: list[ExportCase]


class CaseRow(BaseModel):
    id: str
    title: str
    capability: str
    type: str
    priority: str
    result: str
    effective_result: str
    reqs: list[str]
    bug: str | None
    file: str


class CaseCounts(BaseModel):
    """The cases of one capability or type per effective result; `other` holds any other value."""

    name: str
    passed: int = 0
    failed: int = 0
    blocked: int = 0
    not_run: int = 0
    outdated: int = 0
    other: int = 0
    total: int = 0


class Counts(BaseModel):
    by_capability: list[CaseCounts]
    by_type: list[CaseCounts]


class CaseList(BaseModel):
    cases: list[CaseRow]
    counts: Counts


class CaseBug(BaseModel):
    """The bead a case's `bug` names; only `id` when the export snapshot does not hold it."""

    id: str
    title: str | None = None
    status: str | None = None
    priority: int | None = None


class RunStep(BaseModel):
    n: int
    title: str
    status: str
    error: str | None
    screenshot: bool


class LatestRun(BaseModel):
    folder: str  # the case's `run` as written
    status: str | None
    started: str | None
    finished: str | None
    error: str | None
    steps: list[RunStep]


class CaseDetail(CaseRow):
    """Sent with `model_dump(by_alias=True, exclude={"bug"})`: `bug_detail` replaces the row's
    `bug` (REQ-QA-004)."""

    preconditions: list[Any]
    steps: list[Any]
    expected: list[Any]
    bug_detail: CaseBug | None = Field(serialization_alias="bug")
    latest_run: LatestRun | None
    latest_run_reason: RunReason | None


class QaErrorBody(BaseModel):
    error: str
    cause: Cause | None


# the readiness checklist of a milestone (REQ-QA-008, REQ-QA-009)
class ReqEntry(BaseModel):
    id: str
    title: str
    capability: str


class CaseEntry(BaseModel):
    id: str
    title: str
    effective_result: str
    bug: str | None


class BugEntry(BaseModel):
    id: str
    title: str
    priority: int
    epic: EpicRef | None  # its source epic (REQ-REPORTS-040)


class EpicEntry(BaseModel):
    id: str
    title: str
    gate: str  # the first unmet gate, or "unknown" when its `gin state` failed


class ReadinessItem(BaseModel):
    """One item of the checklist; only the list of its `key` is filled."""

    key: ItemKey
    title: str
    state: ItemState
    note: str | None = None
    error: str | None = None  # the message of the source that made it unknown
    requirements: list[ReqEntry] = Field(default_factory=list)
    cases: list[CaseEntry] = Field(default_factory=list)
    bugs: list[BugEntry] = Field(default_factory=list)
    epics: list[EpicEntry] = Field(default_factory=list)


class MilestoneRef(BaseModel):
    id: str
    title: str


class EpicRow(BaseModel):
    id: str
    title: str
    status: str


class Readiness(BaseModel):
    milestone: MilestoneRef
    epics: list[EpicRow]
    generated_at: datetime
    verdict: Verdict
    items: list[ReadinessItem]  # always cases, results, bugs and gates, in that order


# what `gin-qa runs export --format json` prints, only the keys the console uses (REQ-QA-014)
class ExportRun(BaseModel):
    model_config = ConfigDict(extra="ignore")

    case: str
    capability: str = ""
    hash8: str = ""
    result: str
    at: AwareDatetime
    bug: str = ""

    @field_validator("at")
    @classmethod
    def _utc(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)


class RunExport(BaseModel):
    runs: list[ExportRun]
    problems: list[str] = Field(default_factory=list)


# the trends of a project (REQ-QA-014 to REQ-QA-017)
class PassRatePoint(BaseModel):
    date: date
    passed: int
    failed: int
    rate: float | None


class PassRateRow(BaseModel):
    name: str
    points: list[PassRatePoint]


class FlakyCase(BaseModel):
    case: str
    capability: str
    flips: int
    last_result: str
    last_at: datetime


class FixStats(BaseModel):
    fixes: int
    median_seconds: float | None


class CapabilityFix(FixStats):
    name: str


class TimeToFix(BaseModel):
    overall: FixStats
    by_capability: list[CapabilityFix]


class StillFailing(BaseModel):
    case: str
    capability: str
    failing_since: datetime
    bug: str | None


class Trends(BaseModel):
    days: list[date]
    tz: str
    pass_rate: list[PassRateRow]
    flaky: list[FlakyCase]
    time_to_fix: TimeToFix
    still_failing: list[StillFailing]
    problems: list[str]
