"""`python -m gin_console check-contract`: run the gin calls the console makes and report
whether their JSON is still what the console reads."""

import argparse
import os
import re
import sys
import types
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Annotated, Any, Literal, Protocol, TextIO, Union, get_args, get_origin

from pydantic import BaseModel, ValidationError

from gin_console.beads.errors import BeadsError
from gin_console.beads.kinds import kind_of
from gin_console.beads.source import read_export
from gin_console.config import ConfigError, load_settings, resolve_config_path
from gin_console.milestones.models import MilestoneDetail, MilestoneList
from gin_console.milestones.source import (
    GW_TIMEOUT,
    MilestonesError,
    list_milestones,
    show_milestone,
)
from gin_console.projects.collect import (
    CollectError,
    configure_gin,
    parse_epic_workflow,
    run_json,
)
from gin_console.projects.models import EpicWorkflow
from gin_console.qa.router import GATE_TIMEOUT
from gin_console.requirements.models import Reqs, Trace
from gin_console.requirements.source import (
    GIN_TIMEOUT,
    RequirementsError,
    load_reqs,
    load_trace,
)

KINDS = ("capability", "technical", "parity")
FAILING = ("missing", "type", "error")
Runner = Callable[[list[str], Path, float], Any]


@dataclass(frozen=True)
class Finding:
    kind: Literal["missing", "type", "error", "new", "note"]
    path: str  # "a.b[0].c", or "" for a whole-call error or note
    message: str


@dataclass(frozen=True)
class CallReport:
    call: str  # e.g. "gin milestone list --all --json"
    findings: list[Finding] = field(default_factory=list)
    skipped: str | None = None  # why the call did not run; the report prints it instead of ok

    @property
    def failed(self) -> bool:
        return any(f.kind in FAILING for f in self.findings)


def _path_of(loc: Sequence[str | int]) -> str:
    path = ""
    for part in loc:
        path += f"[{part}]" if isinstance(part, int) else f".{part}" if path else str(part)
    return path


def findings_of(exc: Exception) -> list[Finding]:
    """What a failed parse tells the operator."""
    if isinstance(exc, ValidationError):
        return [
            Finding(
                "missing" if err["type"] == "missing" else "type", _path_of(err["loc"]), err["msg"]
            )
            for err in exc.errors()
        ]
    if isinstance(exc, KeyError):
        return [Finding("missing", str(exc.args[0]), "key not in the output")]
    if isinstance(exc, TypeError):
        return [Finding("type", "", str(exc))]
    return [Finding("error", "", str(exc))]  # MilestonesError, RequirementsError, CollectError


def _models_in(annotation: Any, value: Any, path: str) -> list[Finding]:
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return new_keys(annotation, value, path)
    origin = get_origin(annotation)
    args = get_args(annotation)
    if origin is Annotated:
        return _models_in(args[0], value, path)
    if origin in (Union, types.UnionType):
        return [f for arg in args for f in _models_in(arg, value, path)]
    if origin is list and isinstance(value, list):
        return [
            f for i, item in enumerate(value) for f in _models_in(args[0], item, f"{path}[{i}]")
        ]
    return []


def new_keys(
    model: type[BaseModel], raw: Any, path: str = "", root: bool = True
) -> list[Finding]:
    """Keys of `raw` that `model` does not read, inside the objects the model reads; with
    `root` false, unknown keys of `raw` itself are not listed, only those of objects below."""
    if not isinstance(raw, dict):
        return []
    known: dict[str, Any] = {}
    for name, info in model.model_fields.items():
        known[name] = info
        for alias in (info.alias, info.validation_alias):
            if isinstance(alias, str):
                known[alias] = info
    found: list[Finding] = []
    for key, value in raw.items():
        where = f"{path}.{key}" if path else str(key)
        if key not in known:
            if root:
                found.append(Finding("new", where, "key the console does not read"))
        else:
            found += _models_in(known[key].annotation, value, where)
    return found


def _once_per_item(findings: list[Finding]) -> list[Finding]:
    """A new key repeated in every item of a list is listed for the first item only."""
    seen: set[str] = set()
    kept: list[Finding] = []
    for finding in findings:
        key = re.sub(r"\[\d+\]", "[]", finding.path)
        if finding.kind != "new" or key not in seen:
            kept.append(finding)
        seen.add(key)
    return kept


def choose_epics(rows: Sequence[Mapping[str, Any]]) -> dict[str, str | None]:
    """The newest epic of each kind, by `created_at`; None for a kind with no epic."""
    newest: dict[str, tuple[str, str]] = {}
    for row in rows:
        labels = row.get("labels")
        names = [x for x in labels if isinstance(x, str)] if isinstance(labels, list) else []
        kind = kind_of(str(row.get("issue_type")), names)
        ident = row.get("id")
        if kind is None or not isinstance(ident, str):
            continue
        stamp = row.get("created_at")
        key = (stamp if isinstance(stamp, str) else "", ident)
        if kind not in newest or key > newest[kind]:
            newest[kind] = key
    return {kind: newest[kind][1] if kind in newest else None for kind in KINDS}


def _gin_runner(args: list[str], cwd: Path, timeout: float) -> Any:
    # the server reads the JSON of a failed `gin state` too (a gate that is not met exits 1)
    return run_json(["gin", *args], cwd, json_on_failure=args[:1] == ["state"], timeout=timeout)


class _Run(Protocol):
    def __call__(self, args: list[str], cwd: Path) -> Any: ...


def _parse_state(cwd: Path, argv: list[str]) -> Callable[[_Run], EpicWorkflow]:
    return lambda run: parse_epic_workflow(run(argv, cwd))


def _check(
    runner: Runner,
    argv: list[str],
    timeout: float,
    parse: Callable[[_Run], Any],
    model: type[BaseModel],
    root: bool = True,
) -> tuple[CallReport, Any]:
    """Run one call and parse it as the server does; returns the report and what was parsed."""
    call = f"gin {' '.join(argv)}"
    seen: list[Any] = []

    def run(args: list[str], cwd: Path) -> Any:
        seen.append(runner(args, cwd, timeout))
        return seen[-1]

    try:
        parsed = parse(run)
    except (
        CollectError, MilestonesError, RequirementsError, KeyError, TypeError, ValidationError
    ) as exc:
        findings = findings_of(exc)
        # the sources say "not understood"; the model says which key
        if isinstance(exc, (MilestonesError, RequirementsError)) and exc.cause is None and seen:
            try:
                model.model_validate(seen[0])
            except ValidationError as detail:
                findings = findings_of(detail)
        return CallReport(call, findings), None
    raw = seen[0]
    if isinstance(raw, dict):
        raw = {k: v for k, v in raw.items() if k != "schema"}  # compared by the source
    return CallReport(call, _once_per_item(new_keys(model, raw, root=root))), parsed


def run_check(
    cwd: Path,
    epics: Sequence[str] | None,
    milestone: str | None,
    runner: Runner,
) -> list[CallReport]:
    """Every call of the contract, in order; a call that cannot run is a failed report."""
    reports: list[CallReport] = []
    chosen: dict[str, str | None]
    if epics is not None:
        chosen = {epic: epic for epic in epics}
    else:
        try:
            chosen = dict(choose_epics(read_export(cwd)))
        except BeadsError as exc:
            chosen = {}
            reports.append(CallReport("gin state", skipped=f"skipped, {exc}"))
    for kind, epic in chosen.items():
        if epic is None:
            reports.append(CallReport(kind, skipped="not covered"))
            continue
        args = ["state", "--workflow-id", epic, "--format", "json"]
        reports.append(_check(
            runner, args, GATE_TIMEOUT, _parse_state(cwd, args), EpicWorkflow, root=False
        )[0])

    report, listing = _check(
        runner, ["milestone", "list", "--all", "--json"], GW_TIMEOUT,
        lambda run: list_milestones(run, cwd), MilestoneList,
    )
    reports.append(report)
    target = milestone or (listing.milestones[0].id if listing and listing.milestones else None)
    if target is None:
        reports.append(CallReport("gin milestone show", skipped="skipped, no milestone"))
    else:
        reports.append(_check(
            runner, ["milestone", "show", target, "--json"], GW_TIMEOUT,
            lambda run: show_milestone(run, cwd, target, None), MilestoneDetail,
        )[0])
    reports.append(_check(
        runner, ["specs", "trace", "--all", "--format", "json"], GIN_TIMEOUT,
        lambda run: load_trace(run, cwd), Trace,
    )[0])
    reports.append(_check(
        runner, ["specs", "reqs", "--format", "json"], GIN_TIMEOUT,
        lambda run: load_reqs(run, cwd), Reqs,
    )[0])
    return reports


def render(report: CallReport) -> list[str]:
    if report.skipped is not None:
        return [f"{report.call}: {report.skipped}"]
    lines = [f"{report.call}: {'FAILED' if report.failed else 'ok'}"]
    for f in report.findings:
        if f.kind in ("missing", "new"):
            detail = f.path
        else:
            detail = f"{f.path} ({f.message})" if f.path else f.message
        lines.append(f"  {f.kind}: {detail}")
    return lines


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m gin_console check-contract",
        description="Run the gin calls the console makes and check their JSON.",
    )
    parser.add_argument("--project", help="project name (default: the first configured)")
    parser.add_argument("--epic", action="append", help="epic id for gin state (repeatable)")
    parser.add_argument("--milestone", help="milestone id for gin milestone show")
    return parser


def main(
    argv: Sequence[str],
    env: Mapping[str, str] = os.environ,
    out: TextIO | None = None,
    runner: Runner = _gin_runner,
) -> int:
    """0: no call failed; 1: a call failed or its JSON differs; 2: the check could not start."""
    out = out or sys.stdout
    try:
        args = _parser().parse_args(list(argv))
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2
    config = resolve_config_path(env)
    try:
        settings = load_settings(config, check_users=False)
    except ConfigError as exc:
        print(f"gin-console: {exc}", file=sys.stderr)
        return 2
    projects = {p.name: p for p in settings.projects}
    if not projects:
        print("gin-console: no project is configured", file=sys.stderr)
        return 2
    name = args.project or next(iter(projects))
    if name not in projects:
        print(f"gin-console: unknown project: {name}", file=sys.stderr)
        return 2
    configure_gin(settings.gin.path, config)
    reports = run_check(projects[name].path, args.epic, args.milestone, runner)
    for report in reports:
        for line in render(report):
            print(line, file=out)
    return 1 if any(r.failed for r in reports) else 0
