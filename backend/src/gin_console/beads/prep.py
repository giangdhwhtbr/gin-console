"""The prep-task rule, as gin-workflow `workflow_core/prep.py` `is_prep` holds it."""

from collections.abc import Iterable
from typing import Any


def is_prep(labels: Iterable[str]) -> bool:
    """A prep task has the label `prep` and no label starting with `track:` or `req:`."""
    found = list(labels)
    return "prep" in found and not any(label.startswith(("track:", "req:")) for label in found)


def row_is_prep(row: dict[str, Any]) -> bool:
    """`is_prep` over the `labels` of an exported row; a missing or malformed list is no prep."""
    labels = row.get("labels")
    if not isinstance(labels, list):
        return False
    return is_prep(label for label in labels if isinstance(label, str))
