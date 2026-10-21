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


def related(
    ident: str, kind: str, status: str = "open", title: str | None = None
) -> dict[str, Any]:
    return bead(ident, status=status, title=title or f"Title of {ident}", dependency_type=kind)


class FakeBd:
    """list: `beads`; show: `shown[id]` (a bead with its `dependencies`); dep list up: `up[id]`."""

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
        raise AssertionError(f"unexpected bd arguments: {args}")
