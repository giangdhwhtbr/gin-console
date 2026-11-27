"""API cases of test coverage and release readiness (REQ-QA-001 to REQ-QA-009), through the app
with a fake `gin-qa`, `gin milestone`, `gin specs trace` and `gin state`.

A case whose scenario the module tests of the endpoint already run exactly calls that test, so the
case and its test cannot drift apart."""

import json
from pathlib import Path
from typing import Any

import test_qa_api as cases_api
import test_qa_readiness_api as readiness_api
import test_qa_screenshot_api as screenshot_api
from fake_export import bead, write_export
from fake_gin import FakeGin, req, trace
from fake_gin_qa import EXPORT, FakeGinQa, case, export
from fastapi.testclient import TestClient
from test_qa_readiness_api import Gates, Sources, readiness, rows, shown, states

from gin_console.projects.models import BlockError, EpicWorkflow
from gin_console.qa.source import QaError

RUN = "qa/evidence/2026-11-23T10-34-33"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100


def covering(ident: str, *reqs: str, **fields: Any) -> dict[str, Any]:
    """A case of the export that lists `reqs`."""
    return case(ident, reqs=[{"id": r, "hash8": "1a2b3c4d"} for r in reqs], **fields)


def epics_of(milestone: str, *epics: str) -> list[dict[str, Any]]:
    return [bead(milestone, issue_type="milestone")] + [
        bead(e, issue_type="epic", parent=milestone) for e in epics
    ]


def bug(ident: str, priority: int, **fields: Any) -> dict[str, Any]:
    return bead(ident, issue_type="bug", priority=priority, **fields)


# TC: TC-QA-001@95eaf036
def test_tc_qa_001_rows_and_counts(tmp_path: Path) -> None:
    cases_api.test_qa_001_rows_and_counts(tmp_path)


# TC: TC-QA-002@2a292a2e
def test_tc_qa_002_unknown_result_and_new_keys(tmp_path: Path) -> None:
    cases_api.test_qa_001_unknown_result_and_new_keys(tmp_path)


# TC: TC-QA-003@062e067c
def test_tc_qa_003_no_gin_qa(tmp_path: Path) -> None:
    cases_api.test_qa_002_no_gin_qa(tmp_path)


# TC: TC-QA-004@305a2285
def test_tc_qa_004_old_gin_qa(tmp_path: Path) -> None:
    cases_api.test_qa_002_old_gin_qa(tmp_path)


# TC: TC-QA-005@44ddea96
def test_tc_qa_005_timeout(tmp_path: Path) -> None:
    cases_api.test_qa_002_timeout(tmp_path)


# TC: TC-QA-006@03ab209b
def test_tc_qa_006_hidden_project(tmp_path: Path) -> None:
    cases_api.test_qa_002_hidden_project(tmp_path)  # the list, a case and its screenshot
    readiness_api.test_qa_002_readiness_hidden_project(tmp_path / "readiness")


# TC: TC-QA-007@6fea51da
def test_tc_qa_007_two_readers(tmp_path: Path) -> None:
    cases_api.test_qa_003_two_readers(tmp_path)


# TC: TC-QA-008@b5c10e63
def test_tc_qa_008_refresh(tmp_path: Path) -> None:
    cases_api.test_qa_003_refresh(tmp_path)


# TC: TC-QA-009@64d57475
def test_tc_qa_009_failure_is_not_kept(tmp_path: Path) -> None:
    cases_api.test_qa_003_failure_not_kept(tmp_path)


# TC: TC-QA-010@87e1c69e
def test_tc_qa_010_failed_case_with_its_bug(tmp_path: Path) -> None:
    cases_api.test_qa_004_failed_case_with_its_bug(tmp_path)


# TC: TC-QA-011@0186c7e1
def test_tc_qa_011_bug_not_in_the_snapshot(tmp_path: Path) -> None:
    cases_api.test_qa_004_bug_not_in_the_snapshot(tmp_path)


# TC: TC-QA-012@8dc73d70
def test_tc_qa_012_unknown_case(tmp_path: Path) -> None:
    cases_api.test_qa_004_unknown_case(tmp_path)


def write_result(tmp_path: Path, run: str, ident: str, steps: list[Any]) -> Path:
    folder = tmp_path / "alpha" / run / ident.lower()
    folder.mkdir(parents=True)
    (folder / "result.json").write_text(json.dumps({"status": "passed", "steps": steps}))
    return folder


def shot(title: str, name: str) -> dict[str, Any]:
    return {"title": title, "status": "passed", "screenshot": name, "error": None}


# TC: TC-QA-013@511dd4a8
def test_tc_qa_013_e2e_run(tmp_path: Path) -> None:
    folder = write_result(
        tmp_path, RUN, "TC-UI-115", [shot("Open", "01.png"), shot("Save", "02.png")]
    )
    (folder / "01.png").write_bytes(PNG)
    (folder / "02.png").write_text("not an image")
    client = cases_api.make(tmp_path, FakeGinQa({EXPORT: export(case("TC-UI-115", run=RUN))}))
    body = client.get("/api/qa/cases/alpha/TC-UI-115").json()
    assert body["latest_run_reason"] is None
    assert body["latest_run"]["folder"] == RUN and body["latest_run"]["status"] == "passed"
    assert [(s["n"], s["screenshot"]) for s in body["latest_run"]["steps"]] == [
        (1, True),
        (2, False),
    ]


# TC: TC-QA-014@1b0dfcb7
def test_tc_qa_014_no_run_here(tmp_path: Path) -> None:
    (tmp_path / "alpha" / "qa" / "evidence" / "r2").mkdir(parents=True)  # no tc-server-001 in it
    data = export(
        case("TC-UI-120", run=""),
        case("TC-UI-121", run="qa/evidence/old"),
        case("TC-SERVER-001", type="api", run="qa/evidence/r2"),
    )
    client = cases_api.make(tmp_path, FakeGinQa({EXPORT: data}))
    got = [
        client.get(f"/api/qa/cases/alpha/{i}").json()
        for i in ("TC-UI-120", "TC-UI-121", "TC-SERVER-001")
    ]
    assert [(b["latest_run"], b["latest_run_reason"]) for b in got] == [
        (None, "no_run"),
        (None, "not_on_host"),
        (None, "not_on_host"),
    ]


# TC: TC-QA-015@909c7f9f
def test_tc_qa_015_refused_run(tmp_path: Path) -> None:
    write_result(tmp_path, RUN, "TC-UI-123", [shot("Open", "../../secret.png")])
    data = export(case("TC-UI-122", run="../outside/r1"), case("TC-UI-123", run=RUN))
    client = cases_api.make(tmp_path, FakeGinQa({EXPORT: data}))
    refused = client.get("/api/qa/cases/alpha/TC-UI-122").json()
    assert (refused["latest_run"], refused["latest_run_reason"]) == (None, "invalid")
    steps = client.get("/api/qa/cases/alpha/TC-UI-123").json()["latest_run"]["steps"]
    assert [s["screenshot"] for s in steps] == [False]


# TC: TC-QA-016@25da93a4
def test_tc_qa_016_screenshot_served(tmp_path: Path) -> None:
    screenshot_api.test_qa_006_served(tmp_path)


# TC: TC-QA-017@628d34bf
def test_tc_qa_017_screenshot_not_served(tmp_path: Path) -> None:
    screenshot_api.test_qa_006_not_served(tmp_path)


def trace_of(*rows_: dict[str, Any]) -> FakeGin:
    return FakeGin({"trace": trace(*rows_)})


def requirement(ident: str, epic: str, op: str = "added", **fields: Any) -> dict[str, Any]:
    change = {"change": f"c-{epic}", "epic": epic, "op": op, "archived": None}
    return req(ident, capability="ui", title=f"Title of {ident}", changes=[change], **fields)


# TC: TC-QA-018@2fcd6cab
def test_tc_qa_018_requirements_of_the_milestone(tmp_path: Path) -> None:
    write_export(tmp_path / "alpha", rows("m2", "e1", "e2"))
    archived = requirement("REQ-UI-002", "e2", "modified")
    archived["changes"][0]["archived"] = "2026-11-20"
    gin = trace_of(
        requirement("REQ-UI-001", "e1"),
        archived,
        requirement("REQ-UI-003", "e9", "modified"),
        requirement("REQ-UI-004", "e1", state="removed"),
    )
    found = export(
        *(
            covering(f"TC-UI-00{n}", f"REQ-UI-00{n}", effective_result="failed")
            for n in (1, 2, 3, 4)
        )
    )
    sources = Sources(shown("m2", "e1", "e2"), gin=gin, qa=FakeGinQa({EXPORT: found}))
    body = readiness(readiness_api.make(tmp_path, sources)).json()
    assert [c["id"] for c in body["items"][1]["cases"]] == ["TC-UI-001", "TC-UI-002"]
    assert body["items"][0]["requirements"] == []  # both requirements have a case


def milestone_client(tmp_path: Path, sources: Sources, rows_: list[dict[str, Any]]) -> TestClient:
    write_export(tmp_path / "alpha", rows_)
    return readiness_api.make(tmp_path, sources)


def two_epics() -> FakeGin:
    return trace_of(requirement("REQ-UI-001", "e1"), requirement("REQ-UI-002", "e2"))


# TC: TC-QA-019@e08f6681
def test_tc_qa_019_not_ready(tmp_path: Path) -> None:
    found = export(
        covering("TC-UI-001", "REQ-UI-001"),
        covering("TC-UI-002", "REQ-UI-001", effective_result="outdated"),
    )
    data = [
        *epics_of("m2", "e1", "e2"),
        bead("e9", issue_type="epic", parent="m9"),
        bug("b-1", 1, parent="e1"),
        bug("b-2", 0),
        bug("b-3", 1, parent="e9"),
    ]
    sources = Sources(
        shown("m2", "e1", "e2"),
        gin=two_epics(),
        qa=FakeGinQa({EXPORT: found}),
        gates=Gates(unmet={"e2": "implementation_complete"}),
    )
    body = readiness(milestone_client(tmp_path, sources, data)).json()
    assert body["verdict"] == "not_ready"
    assert states(body) == dict.fromkeys(("cases", "results", "bugs", "gates"), "fail")
    cases_item, results, bugs, gates = body["items"]
    assert [r["id"] for r in cases_item["requirements"]] == ["REQ-UI-002"]
    assert [(c["id"], c["effective_result"]) for c in results["cases"]] == [
        ("TC-UI-002", "outdated")
    ]
    assert [(b["id"], b["epic"] and b["epic"]["id"]) for b in bugs["bugs"]] == [
        ("b-2", None),
        ("b-1", "e1"),
    ]
    assert gates["epics"] == [
        {"id": "e2", "title": "Title of e2", "gate": "implementation_complete"}
    ]


class WaivedPlan(Gates):
    """Every gate satisfied, but `plan_approved` of `e2` is waived."""

    def __call__(self, cwd: Path, epic_id: str) -> EpicWorkflow | BlockError:
        result = super().__call__(cwd, epic_id)
        if epic_id == "e2" and isinstance(result, EpicWorkflow):
            result.gates["plan_approved"] = "waived(spike only)"
        return result


# TC: TC-QA-020@11cd31d7
def test_tc_qa_020_ready(tmp_path: Path) -> None:
    found = export(covering("TC-UI-001", "REQ-UI-001"), covering("TC-UI-002", "REQ-UI-002"))
    data = [
        *epics_of("m1", "e1", "e2"),
        bead("e9", issue_type="epic", parent="m9"),
        bug("b-1", 2, parent="e1"),  # P2 is not counted
        bug("b-3", 1, parent="e9"),  # of another milestone
    ]
    sources = Sources(
        shown("m1", "e1", "e2"), gin=two_epics(), qa=FakeGinQa({EXPORT: found}), gates=WaivedPlan()
    )
    body = readiness(milestone_client(tmp_path, sources, data), "m1").json()
    assert states(body) == dict.fromkeys(("cases", "results", "bugs", "gates"), "pass")
    assert body["verdict"] == "ready"


# TC: TC-QA-021@753424dd
def test_tc_qa_021_not_run_failed_and_blocked(tmp_path: Path) -> None:
    found = export(
        covering("TC-3", "REQ-UI-001", effective_result="blocked"),
        covering("TC-1", "REQ-UI-001", effective_result="not run"),
        covering("TC-2", "REQ-UI-002", effective_result="failed", bug="b-7"),
    )
    sources = Sources(shown("m2", "e1", "e2"), gin=two_epics(), qa=FakeGinQa({EXPORT: found}))
    body = readiness(milestone_client(tmp_path, sources, epics_of("m2", "e1", "e2"))).json()
    results = body["items"][1]
    assert results["state"] == "fail"
    assert [(c["id"], c["effective_result"], c["bug"]) for c in results["cases"]] == [
        ("TC-1", "not run", None),
        ("TC-2", "failed", "b-7"),
        ("TC-3", "blocked", None),
    ]


# TC: TC-QA-022@6f758d7f
def test_tc_qa_022_unknown(tmp_path: Path) -> None:
    message = "gin-qa is not installed on the console host"
    sources = Sources(
        shown("m2", "e1", "e2"),
        gin=two_epics(),
        qa=FakeGinQa({EXPORT: QaError(message, "missing")}),
        gates=Gates(failing={"e2"}),
    )
    body = readiness(milestone_client(tmp_path, sources, epics_of("m2", "e1", "e2"))).json()
    assert states(body) == {
        "cases": "unknown",
        "results": "unknown",
        "bugs": "pass",
        "gates": "unknown",
    }
    assert body["items"][0]["error"] == message
    assert body["items"][3]["epics"] == [{"id": "e2", "title": "Title of e2", "gate": "unknown"}]
    assert body["verdict"] == "unknown"


# TC: TC-QA-023@a5c98029
def test_tc_qa_023_technical_milestone(tmp_path: Path) -> None:
    sources = Sources(shown("m3", "e3"), gin=two_epics(), qa=FakeGinQa({EXPORT: export()}))
    body = readiness(milestone_client(tmp_path, sources, epics_of("m3", "e3")), "m3").json()
    for item in body["items"][:2]:
        assert (item["state"], item["note"]) == ("pass", "No requirement changed")
    assert body["verdict"] == "ready"


# TC: TC-QA-024@c3f62e22
def test_tc_qa_024_checklist_served(tmp_path: Path) -> None:
    readiness_api.test_qa_009_checklist_served(tmp_path)


# TC: TC-QA-025@bcca3e8a
def test_tc_qa_025_gates_fan_out(tmp_path: Path) -> None:
    readiness_api.test_qa_009_gates_fan_out(tmp_path)


# TC: TC-QA-026@f8068eec
def test_tc_qa_026_unknown_milestone(tmp_path: Path) -> None:
    readiness_api.test_qa_009_unknown_milestone(tmp_path)
