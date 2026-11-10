"""Rows as `bd export` prints them, with an `ai_usage` built from a few numbers."""

import json
from typing import Any

from fake_bd import bead

from gin_console.beads.snapshot import Snapshot, build_snapshot


def usage(
    tokens: int = 0,
    *,
    model: str = "m",
    stage: str = "execute",
    role: str = "main",
    cost: float | None = None,
    stages: dict[str, int] | None = None,
    **quality: Any,
) -> dict[str, Any]:
    """An ai_usage of `tokens` output tokens of one model; `stages` overrides the single stage."""
    per_stage = stages or {stage: tokens}
    total = sum(per_stage.values())
    model_entry = {"input": 0, "output": total, "cache_read": 0, "cache_write": 0, "cost": cost}
    findings = quality.pop("findings", {})
    return {
        "version": 1,
        "models": {model: model_entry},
        "roles": {role: {model: model_entry}},
        "stages": {name: {"tokens": value, "cost": None} for name, value in per_stage.items()},
        "quality": {
            "reopens": 0,
            "bugs": 0,
            "review_cycles": 0,
            "rejections": 0,
            "waivers": 0,
            "findings": {"critical": 0, "important": 0, "minor": 0, "suggestion": 0, **findings},
            **quality,
        },
        "unpriced": [model] if cost is None else [],
        "sources": {"claude_code": "ok", "codex": "ok"},
        "skipped_lines": 0,
    }


def row(ident: str, *, ai: dict[str, Any] | str | None = None, **fields: Any) -> dict[str, Any]:
    """A `bd export` row; `ai` is stored as a JSON string, as bd does."""
    base = bead(ident, **fields)
    if ai is not None:
        base["metadata"] = {"ai_usage": ai if isinstance(ai, str) else json.dumps(ai)}
    return base


def closed(ident: str, at: str, **fields: Any) -> dict[str, Any]:
    return row(ident, status="closed", closed_at=at, **fields)


def snap(rows: list[Any]) -> Snapshot:
    """The snapshot the console builds from these `bd export` rows."""
    return build_snapshot(rows)
