"""The readiness checklist of a milestone (REQ-QA-007, REQ-QA-008), worked out from values its
sources already answered; no I/O. A source that failed makes its item `unknown`, never `pass`."""

from collections.abc import Mapping
from datetime import datetime

from gin_console.milestones.models import EpicPlan, MilestoneDetail
from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.qa.models import (
    BugEntry,
    CaseEntry,
    CaseExport,
    EpicEntry,
    EpicRow,
    ItemKey,
    MilestoneRef,
    Readiness,
    ReadinessItem,
    ReqEntry,
    Verdict,
)
from gin_console.reports.bugs import is_bug, source_epic
from gin_console.reports.models import EpicRef, ReportBead
from gin_console.reports.scope import Tree
from gin_console.requirements.models import Trace, TraceRequirement

GATES = (
    "requirement_confirmed",
    "plan_approved",
    "orchestration_ready",
    "implementation_complete",
    "shipped",
)
TITLES: dict[ItemKey, str] = {
    "cases": "Every requirement has a case",
    "results": "Every case passed since its requirement changed",
    "bugs": "No open P0 or P1 bug",
    "gates": "Every epic shipped",
}
_CHANGING_OPS = ("added", "modified")
NO_REQUIREMENT = "No requirement changed"
NO_EPIC = "No epic"


def scope_requirements(trace: Trace, epics: set[str]) -> list[TraceRequirement]:
    """The requirements not removed that one of `epics` added or modified, archived or not."""
    return sorted(
        (
            requirement
            for requirement in trace.requirements
            if requirement.state != "removed"
            and any(c.op in _CHANGING_OPS and c.epic in epics for c in requirement.changes)
        ),
        key=lambda requirement: requirement.id,
    )


def _item(key: ItemKey, failing: bool) -> ReadinessItem:
    return ReadinessItem(key=key, title=TITLES[key], state="fail" if failing else "pass")


def _unknown(key: ItemKey, error: str | None) -> ReadinessItem:
    return ReadinessItem(key=key, title=TITLES[key], state="unknown", error=error)


def _no_requirement(key: ItemKey) -> ReadinessItem:
    """With no requirement the export is not needed: the item passes whether it read or not."""
    return ReadinessItem(key=key, title=TITLES[key], state="pass", note=NO_REQUIREMENT)


def cases_item(
    reqs: list[TraceRequirement] | None, export: CaseExport | None, error: str | None
) -> ReadinessItem:
    """`cases`: each requirement has at least one case; lists those without."""
    if reqs is None:
        return _unknown("cases", error)
    if not reqs:
        return _no_requirement("cases")
    if export is None:
        return _unknown("cases", error)
    covered = {r.id for case in export.cases for r in case.reqs}
    missing = [
        ReqEntry(id=r.id, title=r.title, capability=r.capability)
        for r in reqs
        if r.id not in covered
    ]
    return _item("cases", bool(missing)).model_copy(update={"requirements": missing})


def results_item(
    reqs: list[TraceRequirement] | None, export: CaseExport | None, error: str | None
) -> ReadinessItem:
    """`results`: each case listing a requirement of the milestone is `passed`; lists the
    others, sorted by id."""
    if reqs is None:
        return _unknown("results", error)
    if not reqs:
        return _no_requirement("results")
    if export is None:
        return _unknown("results", error)
    ids = {r.id for r in reqs}
    others = [
        CaseEntry(
            id=case.id,
            title=case.title,
            effective_result=case.effective_result,
            bug=case.bug or None,
        )
        for case in sorted(export.cases, key=lambda case: case.id)
        if any(r.id in ids for r in case.reqs) and case.effective_result != "passed"
    ]
    return _item("results", bool(others)).model_copy(update={"cases": others})


def bugs_item(beads: list[ReportBead] | None, epics: set[str], error: str | None) -> ReadinessItem:
    """`bugs`: no open P0 or P1 bug whose source epic is one of `epics` or that has none."""
    if beads is None:
        return _unknown("bugs", error)
    tree = Tree(beads)
    found: list[BugEntry] = []
    for bead in beads:
        if not is_bug(bead) or bead.status == "closed" or bead.priority not in (0, 1):
            continue
        source = source_epic(tree, bead)
        if source is not None and source.id not in epics:
            continue  # a bug of another milestone's epic
        found.append(
            BugEntry(
                id=bead.id,
                title=bead.title,
                priority=bead.priority,
                epic=EpicRef(id=source.id, title=source.title) if source else None,
            )
        )
    found.sort(key=lambda entry: (entry.priority, entry.id))
    return _item("bugs", bool(found)).model_copy(update={"bugs": found})


def _unmet_gate(workflow: EpicWorkflow) -> str | None:
    """The first gate in order that is neither satisfied nor waived; a missing gate is unmet."""
    for gate in GATES:
        value = workflow.gates.get(gate, "")
        if value != "satisfied" and not value.startswith("waived"):
            return gate
    return None


def gates_item(
    epics: list[EpicPlan], gates: Mapping[str, EpicWorkflow | BlockError]
) -> ReadinessItem:
    """`gates`: each epic has its five gates satisfied or waived. `fail` when one has an unmet
    gate, else `unknown` when the `gin state` of one failed (or was not asked)."""
    if not epics:
        return ReadinessItem(key="gates", title=TITLES["gates"], state="pass", note=NO_EPIC)
    waiting: list[EpicEntry] = []
    unmet = False
    failures: list[str] = []
    for epic in epics:
        workflow = gates.get(epic.id)
        if isinstance(workflow, EpicWorkflow):
            gate = _unmet_gate(workflow)
            if gate is None:
                continue
            unmet = True
        else:
            gate = "unknown"
            reason = workflow.error if workflow is not None else "gin state was not run"
            failures.append(f"{epic.id}: {reason}")
        waiting.append(EpicEntry(id=epic.id, title=epic.title, gate=gate))
    if unmet or not failures:
        return _item("gates", unmet).model_copy(update={"epics": waiting})
    return _unknown("gates", "; ".join(failures)).model_copy(update={"epics": waiting})


def verdict_of(items: list[ReadinessItem]) -> Verdict:
    if any(item.state == "fail" for item in items):
        return "not_ready"
    if all(item.state == "pass" for item in items):
        return "ready"
    return "unknown"


def build_readiness(
    detail: MilestoneDetail,
    trace: Trace | None,
    trace_error: str | None,
    export: CaseExport | None,
    export_error: str | None,
    beads: list[ReportBead] | None,
    beads_error: str | None,
    gates: Mapping[str, EpicWorkflow | BlockError],
    now: datetime,
) -> Readiness:
    """The checklist of `detail`; a `None` source comes with the error it failed with."""
    epic_ids = {epic.id for epic in detail.epics}
    reqs = None if trace is None else scope_requirements(trace, epic_ids)
    case_error = trace_error if trace is None else export_error
    items = [
        cases_item(reqs, export, case_error),
        results_item(reqs, export, case_error),
        bugs_item(beads, epic_ids, beads_error),
        gates_item(detail.epics, gates),
    ]
    return Readiness(
        milestone=MilestoneRef(id=detail.id, title=detail.title),
        epics=[EpicRow(id=e.id, title=e.title, status=e.status) for e in detail.epics],
        generated_at=now,
        verdict=verdict_of(items),
        items=items,
    )
