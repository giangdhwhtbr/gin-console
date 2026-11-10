"""A stand-in for the `bd` CLI: canned beads, same argument conventions as the real one."""

from pathlib import Path
from typing import Any

NO_ISSUE = {"error": "no issues found matching the provided IDs", "schema_version": 1}


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
    """A row of the `dependencies` list that `bd list --json` prints for a bead."""
    return {"issue_id": issue, "depends_on_id": target, "type": kind}


def export_rows(
    beads: list[Any],
    shown: dict[str, dict[str, Any]],
    up: dict[str, list[dict[str, Any]]],
    comments: dict[str, list[Any]],
) -> list[Any]:
    """What `bd export` prints for these beads: one row per bead, with its dependencies and
    comments. A row of `up[id]` (a bead with `dependency_type`) becomes a bead depending on id."""
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


class FakeBd:
    """export: `beads`, `shown`, `up`, and `comments` as `export_rows` joins them.

    history: `history[id]`, statuses oldest first.
    """

    def __init__(
        self,
        beads: list[Any] | None = None,
        shown: dict[str, dict[str, Any]] | None = None,
        up: dict[str, list[dict[str, Any]]] | None = None,
        failure: Exception | None = None,
        output: Any = None,
        ready: list[str] | None = None,
        blocked: list[str] | None = None,
        failing: dict[str, Exception] | None = None,
        bad: dict[str, Any] | None = None,
        comments: dict[str, list[Any]] | None = None,
        history: dict[str, list[str]] | None = None,
    ) -> None:
        self.beads = beads or []
        self.shown = shown or {}
        self.up = up or {}
        self.failure = failure
        self.output = output  # when set, every command returns exactly this
        self.ready = ready or []
        self.blocked = blocked or []
        self.failing = failing or {}
        self.bad = bad or {}
        self.comments = comments or {}
        self.history = history or {}
        self.calls: list[tuple[list[str], Path]] = []

    def __call__(self, args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any:
        self.calls.append((args, cwd))
        if self.failure is not None:
            raise self.failure
        if self.output is not None:
            return self.output
        if args[0] in self.failing:
            raise self.failing[args[0]]
        if args[0] in self.bad:
            return self.bad[args[0]]
        if args[0] == "export":
            return export_rows(self.beads, self.shown, self.up, self.comments)
        if args[0] == "ready":
            return [bead(ident) for ident in self.ready]
        if args[0] == "blocked":
            return [bead(ident) for ident in self.blocked]
        if args[0] == "list":
            everything = "--all" in args
            return [
                b
                for b in self.beads
                if everything or not isinstance(b, dict) or b.get("status") != "closed"
            ]
        ident = args[-1]
        if args[0] == "show":
            return [self.shown[ident]] if ident in self.shown else NO_ISSUE
        if args[:2] == ["dep", "list"]:
            if ident not in self.shown:
                return {"error": f'resolving {ident}: no issue found matching "{ident}"'}
            return self.up.get(ident, [])
        if args[0] == "comments":
            if ident not in self.shown and ident not in self.comments:
                return {"error": f'resolving {ident}: no issue found matching "{ident}"'}
            return self.comments.get(ident, [])
        if args[0] == "history":
            if ident not in self.history:
                return None  # what bd prints, with exit 0, for an unknown id
            snapshots = [
                {"CommitHash": f"c{n}", "Issue": {**bead(ident), "status": status}}
                for n, status in enumerate(self.history[ident])
            ]
            return snapshots[::-1]  # bd prints the newest snapshot first
        raise AssertionError(f"unexpected bd arguments: {args}")
