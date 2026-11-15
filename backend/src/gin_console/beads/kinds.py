"""Kind, capabilities and complexity of a bead, read from its labels and description."""

import re
from collections.abc import Sequence
from typing import Literal

Kind = Literal["capability", "technical", "parity"]
Complexity = Literal["low", "medium", "high"]

_REQ = re.compile(r"^req:REQ-([A-Z][A-Z0-9-]*?)-(\d+)$")
_NEW = re.compile(r"\s*\(new\)\s*$")
_COMPLEXITY = re.compile(r"^Complexity:\s*(low|medium|high)\b", re.MULTILINE)


def kind_of(issue_type: str, labels: Sequence[str]) -> Kind | None:
    """Epic kind: the first `kind:technical` or `kind:parity` label, else `capability`."""
    if issue_type != "epic":
        return None
    for label in labels:
        if label == "kind:technical":
            return "technical"
        if label == "kind:parity":
            return "parity"
    return "capability"


def declared_capabilities(description: str) -> list[str]:
    """Names on the first `Capabilities:` line of a description."""
    for line in description.splitlines():
        if line.startswith("Capabilities:"):
            names = (_NEW.sub("", part.strip()).strip() for part in line[13:].split(","))
            return [name for name in names if name]
    return []


def req_capabilities(labels: Sequence[str]) -> list[str]:
    """Lower-cased capability of each `req:REQ-<CAP>-<n>` label."""
    found = (_REQ.match(label) for label in labels)
    return [m.group(1).lower() for m in found if m]


def complexity_of(description: str) -> Complexity | None:
    match = _COMPLEXITY.search(description)
    if match is None:
        return None
    word = match.group(1)
    return "low" if word == "low" else "medium" if word == "medium" else "high"
