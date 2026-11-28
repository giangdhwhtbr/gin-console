"""`check-contract`: the five gin calls parsed with the console's own parsing."""

import copy
import io
from pathlib import Path
from typing import Any

import pytest
from fake_export import bead, write_export
from fake_gin import req, trace
from fake_gw import LIST, SHOW

from gin_console.config import CONFIG_ENV
from gin_console.projects.collect import CollectError
from gin_console.projects.contract import (
    CallReport,
    choose_epics,
    findings_of,
    main,
    new_keys,
    run_check,
)
from gin_console.projects.models import EpicWorkflow

STATE = {"stage": "plan", "gates": {"requirement_confirmed": "satisfied"}}
CLEAN_REQ = {k: v for k, v in req().items() if k != "hash8"}
TRACE = trace(CLEAN_REQ)
REQS = {"requirements": [{"id": "REQ-AUTH-001", "title": "Lock out"}]}


class FakeRunner:
    """Answers each gin call by its arguments; an exception in `answers` is raised."""

    def __init__(self, answers: dict[tuple[str, ...], Any]) -> None:
        self.answers = answers
        self.calls: list[tuple[str, ...]] = []
        self.timeouts: dict[tuple[str, ...], float] = {}

    def __call__(self, args: list[str], cwd: Path, timeout: float) -> Any:
        key = tuple(args)
        self.calls.append(key)
        self.timeouts[key] = timeout
        answer = self.answers[key]
        if isinstance(answer, Exception):
            raise answer
        return answer


def state_key(epic: str) -> tuple[str, ...]:
    return ("state", "--workflow-id", epic, "--format", "json")


LIST_KEY = ("milestone", "list", "--all", "--json")
SHOW_KEY = ("milestone", "show", "gw-ab1", "--json")
TRACE_KEY = ("specs", "trace", "--all", "--format", "json")
REQS_KEY = ("specs", "reqs", "--format", "json")


def answers(**over: Any) -> dict[tuple[str, ...], Any]:
    base: dict[tuple[str, ...], Any] = {
        state_key("c1"): STATE,
        LIST_KEY: LIST,
        SHOW_KEY: SHOW,
        TRACE_KEY: TRACE,
        REQS_KEY: REQS,
    }
    for name, value in over.items():
        base[{"list": LIST_KEY, "show": SHOW_KEY, "trace": TRACE_KEY, "reqs": REQS_KEY,
              "state": state_key("c1")}[name]] = value
    return base


def project_with_epics(tmp_path: Path, *epics: dict[str, Any]) -> Path:
    write_export(tmp_path, list(epics))
    return tmp_path


def capability_epic(ident: str = "c1", **over: Any) -> dict[str, Any]:
    return bead(ident, issue_type="epic", **over)


def lines_of(reports: list[CallReport]) -> dict[str, list[str]]:
    return {r.call: [f"{f.kind}: {f.path}" for f in r.findings] for r in reports}


def report_for(reports: list[CallReport], text: str) -> CallReport:
    return next(r for r in reports if text in r.call)


# REQ-SERVER-013 (Current gin)
def test_server_013_current_gin_every_call_ok(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    runner = FakeRunner(answers())
    reports = run_check(project, None, None, runner)
    assert [r.call for r in reports if r.skipped] == ["technical", "parity"]
    ran = [r for r in reports if not r.skipped]
    assert [r.call for r in ran] == [
        "gin state --workflow-id c1 --format json",
        "gin milestone list --all --json",
        "gin milestone show gw-ab1 --json",
        "gin specs trace --all --format json",
        "gin specs reqs --format json",
    ]
    assert not any(r.failed or r.findings for r in ran)
    assert runner.calls == [state_key("c1"), LIST_KEY, SHOW_KEY, TRACE_KEY, REQS_KEY]


# REQ-SERVER-013 (Current gin)
def test_server_013_main_prints_ok_and_exits_0(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    config = tmp_path / "config.yaml"
    config.write_text(f"projects:\n  - {{name: p, path: {project}}}\n")
    out = io.StringIO()
    code = main(["--project", "p"], {CONFIG_ENV: str(config)}, out, FakeRunner(answers()))
    assert code == 0
    assert out.getvalue().splitlines() == [
        "gin state --workflow-id c1 --format json: ok",
        "technical: not covered",
        "parity: not covered",
        "gin milestone list --all --json: ok",
        "gin milestone show gw-ab1 --json: ok",
        "gin specs trace --all --format json: ok",
        "gin specs reqs --format json: ok",
    ]


# REQ-SERVER-013 (Current gin)
def test_server_013_calls_use_the_timeouts_of_the_sources(tmp_path: Path) -> None:
    from gin_console.milestones.source import GW_TIMEOUT
    from gin_console.qa.router import GATE_TIMEOUT
    from gin_console.requirements.source import GIN_TIMEOUT

    project = project_with_epics(tmp_path, capability_epic())
    runner = FakeRunner(answers())
    run_check(project, None, None, runner)
    assert runner.timeouts == {
        state_key("c1"): GATE_TIMEOUT,
        LIST_KEY: GW_TIMEOUT,
        SHOW_KEY: GW_TIMEOUT,
        TRACE_KEY: GIN_TIMEOUT,
        REQS_KEY: GIN_TIMEOUT,
    }


# REQ-SERVER-013 (Missing key)
def test_server_013_missing_key_names_the_path_and_exits_1(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    broken = copy.deepcopy(LIST)
    del broken["milestones"][0]["id"]
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers(list=broken)))
    listing = report_for(reports, "milestone list")
    assert listing.failed
    assert [(f.kind, f.path) for f in listing.findings] == [("missing", "milestones[0].id")]

    config = tmp_path / "config.yaml"
    config.write_text(f"projects:\n  - {{name: p, path: {project}}}\n")
    out = io.StringIO()
    code = main([], {CONFIG_ENV: str(config)}, out, FakeRunner(answers(list=broken)))
    assert code == 1
    assert "list --all --json: FAILED\n  missing: milestones[0].id\n" in out.getvalue()


# REQ-SERVER-013 (Missing key)
def test_server_013_missing_key_of_the_hand_written_state_parse(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers(state={"stage": "plan"})))
    state = report_for(reports, "gin state")
    assert state.failed
    assert [(f.kind, f.path) for f in state.findings] == [("missing", "gates")]


# REQ-SERVER-013 (Changed type)
def test_server_013_changed_type_names_stage_and_exits_1(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    runner = FakeRunner(answers(state={**STATE, "stage": 3}))
    reports = run_check(project, None, None, runner)
    state = report_for(reports, "gin state")
    assert state.failed
    [finding] = state.findings
    assert (finding.kind, finding.path) == ("type", "stage")

    config = tmp_path / "config.yaml"
    config.write_text(f"projects:\n  - {{name: p, path: {project}}}\n")
    out = io.StringIO()
    assert main([], {CONFIG_ENV: str(config)}, out, runner) == 1
    assert "  type: stage (" in out.getvalue()


# REQ-SERVER-013 (New key)
def test_server_013_new_key_is_a_note_and_exits_0(tmp_path: Path) -> None:
    extra = trace({**CLEAN_REQ, "hash8": "1a2b3c4d"})
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers(trace=extra)))
    found = report_for(reports, "specs trace")
    assert not found.failed
    assert [(f.kind, f.path) for f in found.findings] == [("new", "requirements[0].hash8")]

    config = tmp_path / "config.yaml"
    config.write_text(f"projects:\n  - {{name: p, path: {project}}}\n")
    out = io.StringIO()
    assert main([], {CONFIG_ENV: str(config)}, out, FakeRunner(answers(trace=extra))) == 0
    assert "gin specs trace --all --format json: ok\n  new: requirements[0].hash8\n" in (
        out.getvalue()
    )


# REQ-SERVER-013 (New key)
def test_server_013_new_key_of_a_repeated_item_is_listed_once(tmp_path: Path) -> None:
    rows = [{**CLEAN_REQ, "id": f"REQ-AUTH-00{n}", "hash8": "x"} for n in range(3)]
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers(trace=trace(*rows))))
    assert [f.path for f in report_for(reports, "specs trace").findings] == [
        "requirements[0].hash8"
    ]


# REQ-SERVER-013 (New key)
def test_server_013_schema_key_is_read_not_new(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers()))
    assert report_for(reports, "milestone list").findings == []


# REQ-SERVER-013 (New key)
def test_server_013_new_keys_follow_models_aliases_and_lists() -> None:
    raw = {
        "stage": "plan",
        "gates": {"anything": "goes"},
        "project": {"layout": "sdd"},
        "review_waivers": [{"task_id": "t", "bead": "x"}],
    }
    assert [(f.kind, f.path) for f in new_keys(EpicWorkflow, raw)] == [
        ("new", "project"),
        ("new", "review_waivers[0].bead"),
    ]
    assert new_keys(EpicWorkflow, "not an object") == []
    # the root of `gin state` holds much the console does not read: only objects inside count
    assert [(f.kind, f.path) for f in new_keys(EpicWorkflow, raw, root=False)] == [
        ("new", "review_waivers[0].bead")
    ]


# REQ-SERVER-013 (New key)
def test_server_013_state_root_keys_are_not_noted_but_waiver_keys_are(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    state = {**STATE, "harness": {"x": 1}, "review_waivers": [{"task_id": "t", "bead": "b"}]}
    reports = run_check(project, None, None, FakeRunner(answers(state=state)))
    found = report_for(reports, "gin state")
    assert not found.failed
    assert [f.path for f in found.findings] == ["review_waivers[0].bead"]


# REQ-SERVER-013 (Current gin)
def test_server_013_state_calls_use_the_readiness_timeout(tmp_path: Path) -> None:
    from gin_console.qa.router import GATE_TIMEOUT

    project = project_with_epics(tmp_path, capability_epic())
    runner = FakeRunner(answers())
    run_check(project, None, None, runner)
    assert runner.timeouts[state_key("c1")] == GATE_TIMEOUT


# REQ-SERVER-013 (Kind not covered)
def test_server_013_capability_epics_only_leave_the_others_not_covered(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers()))
    skipped = {r.call: r.skipped for r in reports if r.skipped}
    assert skipped == {"technical": "not covered", "parity": "not covered"}
    assert not any(r.failed for r in reports)


# REQ-SERVER-013 (Kind not covered)
def test_server_013_choose_epics_takes_the_newest_of_each_kind() -> None:
    rows = [
        bead("old", issue_type="epic", created_at="2026-01-01T00:00:00Z"),
        bead("new", issue_type="epic", created_at="2026-03-01T00:00:00Z"),
        bead("tech", issue_type="epic", labels=["kind:technical"], created_at="2026-02-01"),
        bead("task", created_at="2026-09-01T00:00:00Z"),
    ]
    assert choose_epics(rows) == {"capability": "new", "technical": "tech", "parity": None}
    assert choose_epics([]) == {"capability": None, "technical": None, "parity": None}


# REQ-SERVER-013 (Kind not covered)
def test_server_013_epic_option_replaces_the_choice(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    runner = FakeRunner({**answers(), state_key("x1"): STATE, state_key("x2"): STATE})
    reports = run_check(project, ["x1", "x2"], "gw-ab1", runner)
    assert [r.call for r in reports][:2] == [
        "gin state --workflow-id x1 --format json",
        "gin state --workflow-id x2 --format json",
    ]
    assert not any(r.skipped for r in reports)
    assert LIST_KEY in runner.calls  # the milestone option is checked, the list still runs


# REQ-SERVER-013 (Kind not covered)
def test_server_013_missing_export_skips_the_state_calls_with_a_note(tmp_path: Path) -> None:
    reports = run_check(tmp_path, None, None, FakeRunner(answers()))
    first = reports[0]
    assert first.call == "gin state" and first.skipped and "issues.jsonl" in first.skipped
    assert not any(r.failed for r in reports)


# REQ-SERVER-013 (Current gin)
def test_server_013_empty_milestone_list_skips_show_with_a_note(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    empty = {**LIST, "milestones": []}
    runner = FakeRunner(answers(list=empty))
    reports = run_check(project, None, None, runner)
    show = report_for(reports, "milestone show")
    assert show.skipped == "skipped, no milestone"
    assert not any(r.failed for r in reports)
    assert SHOW_KEY not in runner.calls


# REQ-SERVER-013 (Current gin)
def test_server_013_failed_run_is_an_error_and_exits_1(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    boom = CollectError("gin not found: set gin.path in /c.yaml")
    reports = run_check(project, None, None, FakeRunner(answers(trace=boom)))
    found = report_for(reports, "specs trace")
    assert found.failed
    assert [(f.kind, f.message) for f in found.findings] == [("error", str(boom))]
    assert not report_for(reports, "specs reqs").failed  # later calls still run


# REQ-SERVER-013 (Current gin)
def test_server_013_schema_change_is_an_error(tmp_path: Path) -> None:
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers(trace={**TRACE, "schema": 2})))
    [finding] = report_for(reports, "specs trace").findings
    assert finding.kind == "error" and "schema 2" in finding.message


# REQ-SERVER-013 (Current gin)
def test_server_013_milestone_show_failure_is_reported_per_key(tmp_path: Path) -> None:
    broken = {k: v for k, v in SHOW.items() if k != "epics"}
    project = project_with_epics(tmp_path, capability_epic())
    reports = run_check(project, None, None, FakeRunner(answers(show=broken)))
    [finding] = report_for(reports, "milestone show").findings
    assert (finding.kind, finding.path) == ("missing", "epics")


# REQ-SERVER-013 (Current gin)
def test_server_013_findings_of_maps_the_exceptions() -> None:
    assert [(f.kind, f.path) for f in findings_of(KeyError("gates"))] == [("missing", "gates")]
    assert [f.kind for f in findings_of(TypeError("bad"))] == ["type"]
    assert [f.kind for f in findings_of(CollectError("x"))] == ["error"]


# REQ-SERVER-013 (Unknown project)
def test_server_013_unknown_project_exits_2_naming_it(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    config = tmp_path / "config.yaml"
    config.write_text(f"projects:\n  - {{name: p, path: {tmp_path}}}\n")
    out = io.StringIO()
    code = main(["--project", "ghost"], {CONFIG_ENV: str(config)}, out, FakeRunner({}))
    assert code == 2
    assert "ghost" in capsys.readouterr().err
    assert out.getvalue() == ""


# REQ-SERVER-013 (Unknown project)
def test_server_013_bad_argument_exits_2(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main(["--nope"], {}, io.StringIO(), FakeRunner({})) == 2
    assert "--nope" in capsys.readouterr().err


# REQ-SERVER-013 (Unknown project)
def test_server_013_no_projects_or_no_config_exits_2(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    config = tmp_path / "config.yaml"
    config.write_text("projects: []\n")
    assert main([], {CONFIG_ENV: str(config)}, io.StringIO(), FakeRunner({})) == 2
    assert "no project" in capsys.readouterr().err
    assert main([], {CONFIG_ENV: str(tmp_path / "none.yaml")}, io.StringIO(), FakeRunner({})) == 2
    assert "config file not found" in capsys.readouterr().err


# REQ-SERVER-013 (Current gin)
def test_server_013_default_project_is_the_first_and_gin_path_is_configured(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[tuple[Path | None, Path | None]] = []
    monkeypatch.setattr(
        "gin_console.projects.contract.configure_gin", lambda p, c: seen.append((p, c))
    )
    first = tmp_path / "first"
    second = tmp_path / "second"
    first.mkdir()
    second.mkdir()
    write_export(first, [capability_epic()])
    config = tmp_path / "config.yaml"
    config.write_text(
        f"gin: {{path: /opt/gin/gin}}\nprojects:\n  - {{name: a, path: {first}}}\n"
        f"  - {{name: b, path: {second}}}\n"
    )
    out = io.StringIO()
    assert main([], {CONFIG_ENV: str(config)}, out, FakeRunner(answers())) == 0
    assert seen == [(Path("/opt/gin/gin"), config)]
    assert out.getvalue().startswith("gin state --workflow-id c1")  # project a, not b


# REQ-SERVER-013 (Current gin)
def test_server_013_the_check_runs_no_bd_and_writes_nothing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import subprocess

    project = project_with_epics(tmp_path, capability_epic())
    before = sorted(p.name for p in project.rglob("*"))

    def refuse(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("the check started a process")

    monkeypatch.setattr(subprocess, "run", refuse)
    run_check(project, None, None, FakeRunner(answers()))
    assert sorted(p.name for p in project.rglob("*")) == before
