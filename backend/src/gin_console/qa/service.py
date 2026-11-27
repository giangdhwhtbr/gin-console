"""The case list with its counts (REQ-QA-001) and the detail of one case (REQ-QA-004)."""

from collections import Counter
from collections.abc import Iterable
from typing import Any

from gin_console.beads.snapshot import Snapshot
from gin_console.config import ProjectEntry
from gin_console.qa.models import (
    CaseBug,
    CaseCounts,
    CaseDetail,
    CaseExport,
    CaseList,
    CaseRow,
    Counts,
    ExportCase,
)
from gin_console.qa.runs import latest_run

# the count column of each effective result gin-qa prints; any other value counts as `other`
_COLUMNS = {
    "passed": "passed",
    "failed": "failed",
    "blocked": "blocked",
    "not run": "not_run",
    "outdated": "outdated",
}


def _row(case: ExportCase) -> CaseRow:
    return CaseRow(
        id=case.id,
        title=case.title,
        capability=case.capability,
        type=case.type,
        priority=case.priority,
        result=case.result,
        effective_result=case.effective_result,
        reqs=[req.id for req in case.reqs],
        bug=case.bug or None,
        file=case.file,
    )


def _counts(groups: Iterable[tuple[str, str]]) -> list[CaseCounts]:
    """One row per name, sorted, from (name, effective result) pairs."""
    tally: dict[str, Counter[str]] = {}
    for name, result in groups:
        tally.setdefault(name, Counter())[_COLUMNS.get(result, "other")] += 1
    return [
        CaseCounts.model_validate({"name": name, **columns, "total": columns.total()})
        for name, columns in sorted(tally.items())
    ]


def build_list(export: CaseExport) -> CaseList:
    cases = sorted(export.cases, key=lambda case: case.id)
    return CaseList(
        cases=[_row(case) for case in cases],
        counts=Counts(
            by_capability=_counts((case.capability, case.effective_result) for case in cases),
            by_type=_counts((case.type, case.effective_result) for case in cases),
        ),
    )


def find_case(export: CaseExport, case_id: str) -> ExportCase | None:
    return next((case for case in export.cases if case.id == case_id), None)


def _text(raw: dict[str, Any], key: str) -> str | None:
    value = raw.get(key)
    return value if isinstance(value, str) else None


def _bug(ident: str, snapshot: Snapshot | None) -> CaseBug | None:
    """The bead a case's `bug` names, with its title, status and priority when the snapshot has
    it; only its id otherwise."""
    if not ident:
        return None
    raw = snapshot.rows.get(ident) if snapshot is not None else None
    if raw is None:
        return CaseBug(id=ident)
    priority = raw.get("priority")
    return CaseBug(
        id=ident,
        title=_text(raw, "title"),
        status=_text(raw, "status"),
        priority=priority if type(priority) is int else None,  # not a bool
    )


def case_detail(
    export: CaseExport, snapshot: Snapshot | None, entry: ProjectEntry, case_id: str
) -> CaseDetail | None:
    case = find_case(export, case_id)
    if case is None:
        return None
    run, reason = latest_run(entry, case)
    return CaseDetail(
        **_row(case).model_dump(),
        preconditions=case.preconditions,
        steps=case.steps,
        expected=case.expected,
        bug_detail=_bug(case.bug, snapshot),
        latest_run=run,
        latest_run_reason=reason,
    )
