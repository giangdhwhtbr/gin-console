"""The readiness checklist of a milestone, worked out from its sources (REQ-QA-007, REQ-QA-008)."""

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

from fake_gin import req, trace
from fake_gin_qa import case, export
from fake_gw import SHOW
from report_beads import row, snap

from gin_console.milestones.models import MilestoneDetail
from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.qa.models import CaseExport, ItemKey, ItemState, Readiness, ReadinessItem
from gin_console.qa.readiness import (
    GATES,
    TITLES,
    build_readiness,
    gates_item,
    scope_requirements,
    verdict_of,
)
from gin_console.reports.models import ReportBead
from gin_console.reports.source import read_beads
from gin_console.requirements.models import Trace

NOW = datetime(2026, 11, 27, 3, 0, tzinfo=UTC)
NO_GIN_QA = "gin-qa is not installed on the console host"


def epic(ident: str, status: str = "open") -> dict[str, Any]:
    return {**SHOW["epics"][0], "id": ident, "title": f"Title of {ident}", "status": status}


def milestone(ident: str, *epics: dict[str, Any]) -> MilestoneDetail:
    return MilestoneDetail.model_validate({**SHOW, "id": ident, "title": "M2", "epics": epics})


def change(epic_id: str | None, op: str = "added", archived: str | None = None) -> dict[str, Any]:
    return {"change": f"c-{epic_id}", "epic": epic_id, "op": op, "archived": archived}


def requirement(ident: str, *changes: dict[str, Any], **fields: Any) -> dict[str, Any]:
    return req(ident, capability="ui", title=f"Title of {ident}", changes=list(changes), **fields)


def traced(*rows: dict[str, Any]) -> Trace:
    return Trace.model_validate(trace(*rows))


def cases(*rows: dict[str, Any]) -> CaseExport:
    return CaseExport.model_validate(export(*rows))


def covering(ident: str, *reqs: str, **fields: Any) -> dict[str, Any]:
    """A case of `gin-qa cases export` that lists `reqs`."""
    return case(ident, reqs=[{"id": r, "hash8": "1a2b3c4d"} for r in reqs], **fields)


def beads(*rows: dict[str, Any]) -> list[ReportBead]:
    return read_beads(snap(list(rows)), "alpha", {})


def bug(ident: str, priority: int, **fields: Any) -> dict[str, Any]:
    return row(ident, issue_type="bug", priority=priority, **fields)


def shipped(**gates: str) -> EpicWorkflow:
    """An epic workflow with its five gates satisfied, but those given."""
    return EpicWorkflow(stage="shipped", gates={**dict.fromkeys(GATES, "satisfied"), **gates})


def readiness(
    detail: MilestoneDetail,
    trace_rows: Trace | None,
    found: CaseExport | None,
    bead_rows: list[ReportBead] | None,
    gates: Mapping[str, EpicWorkflow | BlockError],
    trace_error: str | None = None,
    export_error: str | None = None,
    beads_error: str | None = None,
) -> Readiness:
    return build_readiness(
        detail, trace_rows, trace_error, found, export_error, bead_rows, beads_error, gates, NOW
    )


def item(result: Readiness, key: str) -> ReadinessItem:
    return next(i for i in result.items if i.key == key)


def states(result: Readiness) -> dict[str, str]:
    return {i.key: i.state for i in result.items}


# the trace of REQ-QA-007: REQ-UI-001 and REQ-UI-002 belong to m2 (epics e1 and e2)
M2_TRACE = traced(
    requirement("REQ-UI-001", change("e1")),
    requirement("REQ-UI-002", change("e2", "modified", archived="2026-11-20")),
    requirement("REQ-UI-003", change("e9", "modified")),
    requirement("REQ-UI-004", change("e1"), state="removed"),
)
M2 = milestone("m2", epic("e1"), epic("e2"))


# REQ-QA-007: Requirements of the milestone
def test_qa_007_requirements_of_the_milestone() -> None:
    scoped = scope_requirements(M2_TRACE, {"e1", "e2"})
    assert [r.id for r in scoped] == ["REQ-UI-001", "REQ-UI-002"]
    found = cases(
        covering("TC-UI-001", "REQ-UI-001", effective_result="failed"),
        covering("TC-UI-002", "REQ-UI-002", effective_result="failed"),
        covering("TC-UI-003", "REQ-UI-003", effective_result="failed"),
        covering("TC-UI-004", "REQ-UI-004", effective_result="failed"),
    )
    result = readiness(M2, M2_TRACE, found, beads(), {"e1": shipped(), "e2": shipped()})
    assert [c.id for c in item(result, "results").cases] == ["TC-UI-001", "TC-UI-002"]
    assert [r.id for r in item(result, "cases").requirements] == []


# REQ-QA-007: a proposed requirement is in scope; a change that removes one, or of no epic, is not
def test_qa_007_proposed_in_scope_and_removing_changes_out() -> None:
    found = traced(
        requirement("REQ-UI-012", change("e1"), state="proposed"),
        requirement("REQ-UI-011", change("e2", "removed")),
        requirement("REQ-UI-010", change(None)),
        requirement("REQ-UI-009", change("e9"), change("e2", "modified")),
    )
    scoped = scope_requirements(found, {"e1", "e2"})
    assert [r.id for r in scoped] == ["REQ-UI-009", "REQ-UI-012"]


# REQ-QA-007: the epics of the milestone, closed or not, are those `gin milestone show` lists
def test_qa_007_epics_closed_or_not() -> None:
    detail = milestone("m2", epic("e1", "closed"), epic("e2"))
    result = readiness(detail, M2_TRACE, cases(), beads(), {"e1": shipped(), "e2": shipped()})
    assert [(e.id, e.title, e.status) for e in result.epics] == [
        ("e1", "Title of e1", "closed"),
        ("e2", "Title of e2", "open"),
    ]
    assert (result.milestone.id, result.milestone.title) == ("m2", "M2")
    assert [r.id for r in item(result, "cases").requirements] == ["REQ-UI-001", "REQ-UI-002"]


# REQ-QA-008: Not ready
def test_qa_008_not_ready() -> None:
    found = cases(
        covering("TC-UI-001", "REQ-UI-001"),
        covering("TC-UI-002", "REQ-UI-001", effective_result="outdated"),
    )
    rows = beads(
        row("e1", issue_type="epic"),
        row("e2", issue_type="epic"),
        row("e9", issue_type="epic"),
        bug("b-1", 1, parent="e1"),
        bug("b-2", 0),
        bug("b-3", 1, parent="e9"),
    )
    gates = {"e1": shipped(), "e2": shipped(implementation_complete="pending")}
    result = readiness(M2, M2_TRACE, found, rows, gates)
    assert [i.key for i in result.items] == ["cases", "results", "bugs", "gates"]
    assert states(result) == dict.fromkeys(("cases", "results", "bugs", "gates"), "fail")
    assert [(r.id, r.title, r.capability) for r in item(result, "cases").requirements] == [
        ("REQ-UI-002", "Title of REQ-UI-002", "ui")
    ]
    assert [c.model_dump() for c in item(result, "results").cases] == [
        {
            "id": "TC-UI-002",
            "title": "Title of TC-UI-002",
            "effective_result": "outdated",
            "bug": None,
        }
    ]
    assert [b.model_dump() for b in item(result, "bugs").bugs] == [
        {"id": "b-2", "title": "Title of b-2", "priority": 0, "epic": None},
        {
            "id": "b-1",
            "title": "Title of b-1",
            "priority": 1,
            "epic": {"id": "e1", "title": "Title of e1"},
        },
    ]
    assert [e.model_dump() for e in item(result, "gates").epics] == [
        {"id": "e2", "title": "Title of e2", "gate": "implementation_complete"}
    ]
    assert result.verdict == "not_ready"
    assert all(i.error is None and i.note is None for i in result.items)


# REQ-QA-008: Ready
def test_qa_008_ready() -> None:
    detail = milestone("m1", epic("e1"), epic("e2"))
    found = cases(covering("TC-UI-001", "REQ-UI-001"), covering("TC-UI-002", "REQ-UI-002"))
    rows = beads(
        row("e1", issue_type="epic"),
        row("e9", issue_type="epic"),
        bug("b-1", 2, parent="e1"),  # P2 is not counted
        row("b-2", issue_type="bug", priority=0, parent="e1", status="closed"),
        bug("b-3", 1, parent="e9"),  # of another milestone
        row("t-1", priority=0),  # not a bug
    )
    gates = {"e1": shipped(), "e2": shipped(plan_approved="waived(spike only)")}
    result = readiness(detail, M2_TRACE, found, rows, gates)
    assert states(result) == dict.fromkeys(("cases", "results", "bugs", "gates"), "pass")
    assert all(
        not (i.requirements or i.cases or i.bugs or i.epics) and i.note is None
        for i in result.items
    )
    assert result.verdict == "ready"


# REQ-QA-008: Not run, failed and blocked
def test_qa_008_not_run_failed_and_blocked() -> None:
    found = cases(
        covering("TC-3", "REQ-UI-001", effective_result="blocked"),
        covering("TC-1", "REQ-UI-001", effective_result="not run"),
        covering("TC-2", "REQ-UI-002", effective_result="failed", bug="b-7"),
    )
    result = readiness(M2, M2_TRACE, found, beads(), {"e1": shipped(), "e2": shipped()})
    listed = item(result, "results")
    assert listed.state == "fail"
    assert [(c.id, c.effective_result, c.bug) for c in listed.cases] == [
        ("TC-1", "not run", None),
        ("TC-2", "failed", "b-7"),
        ("TC-3", "blocked", None),
    ]


# REQ-QA-008: Unknown
def test_qa_008_unknown() -> None:
    gates: dict[str, EpicWorkflow | BlockError] = {
        "e1": shipped(),
        "e2": BlockError(error="gin state timed out"),
    }
    result = readiness(M2, M2_TRACE, None, beads(), gates, export_error=NO_GIN_QA)
    assert states(result) == {
        "cases": "unknown",
        "results": "unknown",
        "bugs": "pass",
        "gates": "unknown",
    }
    assert item(result, "cases").error == NO_GIN_QA
    assert item(result, "results").error == NO_GIN_QA
    gate = item(result, "gates")
    assert [(e.id, e.gate) for e in gate.epics] == [("e2", "unknown")]
    assert gate.error is not None and "e2" in gate.error and "gin state timed out" in gate.error
    assert result.verdict == "unknown"


# REQ-QA-008: Technical milestone
def test_qa_008_technical_milestone() -> None:
    detail = milestone("m3", epic("e3", "closed"))
    result = readiness(detail, M2_TRACE, cases(), beads(), {"e3": shipped()})
    for key in ("cases", "results"):
        assert item(result, key).state == "pass"
        assert item(result, key).note == "No requirement changed"
    assert result.verdict == "ready"


# REQ-QA-008: with no requirement the export is not needed, so a failed export still passes
def test_qa_008_technical_milestone_without_gin_qa() -> None:
    detail = milestone("m3", epic("e3", "closed"))
    result = readiness(detail, M2_TRACE, None, beads(), {"e3": shipped()}, export_error=NO_GIN_QA)
    assert item(result, "cases").note == "No requirement changed"
    assert (item(result, "results").state, item(result, "results").error) == ("pass", None)


# REQ-QA-008: a failed trace makes both case items unknown, never pass, even with no case to read
def test_qa_008_failed_trace_is_unknown() -> None:
    detail = milestone("m3", epic("e3"))
    result = readiness(
        detail, None, cases(), beads(), {"e3": shipped()}, trace_error="gin specs trace failed"
    )
    for key in ("cases", "results"):
        assert item(result, key).state == "unknown"
        assert item(result, key).error == "gin specs trace failed"
        assert item(result, key).note is None
    assert result.verdict == "unknown"


# REQ-QA-008: with the trace and the export both failed, the case items show the trace's error
def test_qa_008_failed_trace_and_export_show_the_trace_error() -> None:
    result = readiness(
        M2,
        None,
        None,
        beads(),
        {"e1": shipped(), "e2": shipped()},
        trace_error="gin specs trace failed",
        export_error=NO_GIN_QA,
    )
    for key in ("cases", "results"):
        assert (item(result, key).state, item(result, key).error) == (
            "unknown",
            "gin specs trace failed",
        )


# REQ-QA-008: an export snapshot that cannot be read makes `bugs` unknown with its error
def test_qa_008_failed_snapshot_is_unknown() -> None:
    gates = {"e1": shipped(), "e2": shipped()}
    found = cases(covering("TC-UI-001", "REQ-UI-001"), covering("TC-UI-002", "REQ-UI-002"))
    result = readiness(M2, M2_TRACE, found, None, gates, beads_error="bad issues.jsonl")
    bugs = item(result, "bugs")
    assert (bugs.state, bugs.error, bugs.bugs) == ("unknown", "bad issues.jsonl", [])
    assert result.verdict == "unknown"


# REQ-QA-008: a closed epic is checked too; a gate missing from `gin state` is unmet
def test_qa_008_closed_epic_and_missing_gate() -> None:
    detail = milestone("m2", epic("e1", "closed"), epic("e2"))
    partial = EpicWorkflow(stage="implement", gates=dict.fromkeys(GATES[:4], "satisfied"))
    result = gates_item(detail.epics, {"e1": shipped(), "e2": partial})
    assert result.state == "fail"
    assert [(e.id, e.gate) for e in result.epics] == [("e2", "shipped")]


# REQ-QA-008: the first unmet gate in order; an unmet gate wins over a failed `gin state`
def test_qa_008_first_unmet_gate_wins_over_unknown() -> None:
    detail = milestone("m2", epic("e1"), epic("e2"), epic("e3"))
    gates: dict[str, EpicWorkflow | BlockError] = {
        "e1": BlockError(error="boom"),
        "e2": shipped(plan_approved="pending", shipped="pending"),
        "e3": shipped(),
    }
    result = gates_item(detail.epics, gates)
    assert result.state == "fail" and result.error is None
    assert [(e.id, e.gate) for e in result.epics] == [("e1", "unknown"), ("e2", "plan_approved")]


# REQ-QA-008: an epic `gin state` was not asked for is never counted as shipped
def test_qa_008_epic_without_gates_is_unknown() -> None:
    result = gates_item(milestone("m2", epic("e1")).epics, {})
    assert result.state == "unknown"
    assert [(e.id, e.gate) for e in result.epics] == [("e1", "unknown")]


# REQ-QA-008: `gates` passes with the note "No epic" when the milestone has none
def test_qa_008_no_epic() -> None:
    result = readiness(milestone("m5"), M2_TRACE, cases(), beads(), {})
    gate = item(result, "gates")
    assert (gate.state, gate.note, gate.epics) == ("pass", "No epic", [])
    assert item(result, "cases").note == "No requirement changed"
    assert result.verdict == "ready"


# REQ-QA-008: the four items and their titles
def test_qa_008_titles() -> None:
    result = readiness(M2, M2_TRACE, cases(), beads(), {"e1": shipped(), "e2": shipped()})
    assert [(i.key, i.title) for i in result.items] == list(TITLES.items())
    assert TITLES == {
        "cases": "Every requirement has a case",
        "results": "Every case passed since its requirement changed",
        "bugs": "No open P0 or P1 bug",
        "gates": "Every epic shipped",
    }
    assert result.generated_at == NOW


def checklist(*found: ItemState) -> list[ReadinessItem]:
    keys: tuple[ItemKey, ...] = ("cases", "results", "bugs", "gates")
    return [
        ReadinessItem(key=key, title=TITLES[key], state=state)
        for key, state in zip(keys, found, strict=True)
    ]


# REQ-QA-008: the verdict
def test_qa_008_verdict() -> None:
    assert verdict_of(checklist("pass", "pass", "pass", "pass")) == "ready"
    assert verdict_of(checklist("pass", "unknown", "fail", "pass")) == "not_ready"
    assert verdict_of(checklist("pass", "unknown", "pass", "pass")) == "unknown"
