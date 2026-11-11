"""A stand-in for `read_export`: canned beads joined into the rows `.beads/issues.jsonl` holds."""

import json
from pathlib import Path
from typing import Any


def bead(ident: str = "p-1", **overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": ident,
        "title": f"Title of {ident}",
        "description": "",
        "status": "open",
        "priority": 2,
        "issue_type": "task",
        "owner": "me@example.com",
        "created_at": "2026-10-11T10:00:00Z",
        "created_by": "me",
        "updated_at": "2026-10-12T10:00:00Z",
        "dependency_count": 0,
        "dependent_count": 0,
        "comment_count": 0,
    }
    base.update(overrides)
    return base


def comment(ident: str, text: str = "hello", **overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": f"cmt-{ident}-{len(text)}",
        "issue_id": ident,
        "author": "me",
        "text": text,
        "created_at": "2026-10-12T10:00:00Z",
    }
    base.update(overrides)
    return base


def related(
    ident: str, kind: str, status: str = "open", title: str | None = None
) -> dict[str, Any]:
    return bead(ident, status=status, title=title or f"Title of {ident}", dependency_type=kind)


def dep(issue: str, target: str, kind: str) -> dict[str, Any]:
    """A row of the `dependencies` list of an exported bead."""
    return {"issue_id": issue, "depends_on_id": target, "type": kind}


def export_rows(
    beads: list[Any],
    shown: dict[str, dict[str, Any]],
    up: dict[str, list[dict[str, Any]]],
    comments: dict[str, list[Any]],
) -> list[Any]:
    """The rows `.beads/issues.jsonl` holds for these beads: one row per bead, with its
    dependencies and comments. A row of `up[id]` (a bead with `dependency_type`) becomes a bead
    depending on id."""
    rows: dict[str, Any] = {}
    odd: list[Any] = []
    for row in [*beads, *shown.values()]:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            rows.setdefault(row["id"], dict(row))
        else:
            odd.append(row)
    for target, dependents in up.items():
        for row in dependents:
            if not isinstance(row, dict) or not isinstance(row.get("id"), str):
                continue
            kind = str(row.get("dependency_type"))
            plain = {k: v for k, v in row.items() if k != "dependency_type"}
            entry = rows.setdefault(row["id"], plain)
            entry["dependencies"] = [*entry.get("dependencies", []), dep(row["id"], target, kind)]
    for ident, items in comments.items():
        if ident in rows:
            rows[ident]["comments"] = items
    return [*rows.values(), *odd]


def write_export(project: Path, rows: list[Any]) -> Path:
    """Write `rows` to the project's `.beads/issues.jsonl`, one JSON line each, as bd does."""
    path = project / ".beads" / "issues.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    return path


class FakeExport:
    """Stands in for `read_export`: the rows `export_rows` joins, or `failure`."""

    def __init__(
        self,
        beads: list[Any] | None = None,
        shown: dict[str, dict[str, Any]] | None = None,
        up: dict[str, list[dict[str, Any]]] | None = None,
        comments: dict[str, list[Any]] | None = None,
        failure: Exception | None = None,
        output: Any = None,
    ) -> None:
        self.beads = beads or []
        self.shown = shown or {}
        self.up = up or {}
        self.comments = comments or {}
        self.failure = failure
        self.output = output  # when set, every read returns exactly this
        self.calls: list[Path] = []

    def __call__(self, cwd: Path) -> Any:
        self.calls.append(cwd)
        if self.failure is not None:
            raise self.failure
        if self.output is not None:
            return self.output
        return export_rows(self.beads, self.shown, self.up, self.comments)
