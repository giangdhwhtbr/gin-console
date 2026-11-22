"""Rows as `.beads/issues.jsonl` holds them."""

from typing import Any

from fake_export import bead

from gin_console.beads.snapshot import Snapshot, build_snapshot


def row(ident: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, **fields)


def closed(ident: str, at: str, **fields: Any) -> dict[str, Any]:
    return row(ident, status="closed", closed_at=at, **fields)


def snap(rows: list[Any]) -> Snapshot:
    """The snapshot the console builds from these exported rows."""
    return build_snapshot(rows)
