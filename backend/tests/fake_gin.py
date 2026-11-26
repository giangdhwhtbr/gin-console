from pathlib import Path
from typing import Any


def req(ident: str = "REQ-AUTH-001", **fields: Any) -> dict[str, Any]:
    return {
        "id": ident,
        "title": "Lock out",
        "capability": "auth",
        "state": "living",
        "hash8": "1a2b3c4d",
        "source": "docs/specs/auth/spec.md:12",
        "changes": [],
        "signoff": None,
        "beads": [],
        "cases": [],
        "tests": [],
        **fields,
    }


def trace(*rows: dict[str, Any], **fields: Any) -> dict[str, Any]:
    return {
        "schema": 1,
        "layout": "sdd",
        "requirements": list(rows),
        "warnings": [],
        "skipped": [],
        **fields,
    }


class FakeGin:
    """Answers `specs trace` and `specs reqs`; an exception in `outputs` is raised."""

    def __init__(self, outputs: dict[str, Any]) -> None:
        self.outputs = outputs
        self.calls: list[list[str]] = []

    def __call__(self, args: list[str], cwd: Path) -> Any:
        self.calls.append(args)
        answer = self.outputs[args[1]]
        if isinstance(answer, Exception):
            raise answer
        return answer
