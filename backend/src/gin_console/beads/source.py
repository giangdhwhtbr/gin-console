"""Beads of a project, read through the `bd` CLI; the only module that knows its JSON."""

import re
from pathlib import Path
from typing import Any, Protocol

from pydantic import ValidationError

from gin_console.beads.models import BeadDetail, BeadSummary, Relation
from gin_console.projects.collect import CollectError, run_json
from gin_console.quota.source import clean

BD_TIMEOUT = 30.0
_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")
_SUMMARY_KEYS = (
    "id",
    "title",
    "status",
    "priority",
    "issue_type",
    "labels",
    "owner",
    "assignee",
    "parent",
    "created_at",
    "updated_at",
    "dependency_count",
    "dependent_count",
    "comment_count",
    "closed_at",
)


class BeadsError(Exception):
    """`bd` failed or said something unexpected; the message is shown to the operator."""


class BeadNotFound(Exception):
    """No such bead."""


class BdRunner(Protocol):
    def __call__(self, args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any: ...


def run_bd(args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any:
    try:
        return run_json(["bd", *args], cwd, json_on_failure=json_on_failure, timeout=BD_TIMEOUT)
    except CollectError as exc:
        raise BeadsError(str(exc)) from None


def valid_id(value: str) -> bool:
    return _ID.fullmatch(value) is not None


def _summary(raw: Any) -> BeadSummary | None:
    if not isinstance(raw, dict):
        return None
    try:
        return BeadSummary.model_validate({k: raw[k] for k in _SUMMARY_KEYS if k in raw})
    except ValidationError:
        return None


def _ids(data: Any, what: str) -> set[str]:
    if not isinstance(data, list):
        raise BeadsError(f"bd {what} output was not understood")
    return {row["id"] for row in data if isinstance(row, dict) and isinstance(row.get("id"), str)}


def list_beads(run: BdRunner, cwd: Path, closed: bool) -> list[BeadSummary]:
    data = run(["list", "--limit", "0", "--json", *(["--all"] if closed else [])], cwd)
    if not isinstance(data, list):
        raise BeadsError("bd list output was not understood")
    # `bd ready` stops at 100 results unless told otherwise;
    # both answers are only ever used as id sets
    ready = _ids(run(["ready", "--limit", "0", "--json"], cwd), "ready")
    blocked = _ids(run(["blocked", "--json"], cwd), "blocked")
    return [
        bead.model_copy(
            update={
                "ready": bead.id in ready,
                "blocked": bead.id in blocked or bead.status == "blocked",
            }
        )
        for bead in map(_summary, data)
        if bead is not None
    ]


def _fail_on_error(data: Any) -> None:
    """`bd show` and `bd dep list` answer an unknown id with exit 1 and {"error": ...}."""
    if isinstance(data, dict) and "error" in data:
        message = clean(str(data["error"]))  # it reaches response bodies: no lone surrogates
        if "no issue" in message:
            raise BeadNotFound(message)
        raise BeadsError(f"bd: {message[:200]}")


def _relations(rows: Any) -> list[Relation]:
    relations: list[Relation] = []
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict):
            continue
        try:
            relations.append(Relation.model_validate({**row, "type": row.get("dependency_type")}))
        except ValidationError:  # a malformed row, or a kind this view does not show
            continue
    return relations


def get_bead(run: BdRunner, cwd: Path, bead_id: str) -> BeadDetail:
    if not valid_id(bead_id):
        raise BeadNotFound(bead_id)
    shown = run(["show", "--json", "--", bead_id], cwd, json_on_failure=True)
    _fail_on_error(shown)
    if not isinstance(shown, list) or not shown or not isinstance(shown[0], dict):
        raise BeadsError("bd show output was not understood")
    raw = shown[0]
    up = run(
        ["dep", "list", "--direction", "up", "--json", "--", bead_id], cwd, json_on_failure=True
    )
    _fail_on_error(up)
    if not isinstance(up, list):
        raise BeadsError("bd dep list output was not understood")
    above = _relations(up)
    try:
        return BeadDetail.model_validate(
            {
                **{k: raw[k] for k in _SUMMARY_KEYS if k in raw},
                "description": raw.get("description") or None,
                "dependencies": _relations(raw.get("dependencies")),
                "dependents": [r for r in above if r.type == "blocks"],
                "children": [r for r in above if r.type == "parent-child"],
            }
        )
    except ValidationError:
        raise BeadsError("bd show output was not understood") from None
