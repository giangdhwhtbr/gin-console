from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Cause = Literal["missing", "outdated"]
RunReason = Literal["no_run", "not_on_host", "invalid"]


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
