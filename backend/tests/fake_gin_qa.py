"""A stand-in for the `gin-qa` runner: canned `cases export` answers and a call log."""

import time
from pathlib import Path
from typing import Any

EXPORT = ("cases", "export", "--format", "json")


def case(ident: str = "TC-UI-001", **fields: Any) -> dict[str, Any]:
    """One case of `gin-qa cases export --format json`, with every key it prints."""
    return {
        "id": ident,
        "title": f"Title of {ident}",
        "capability": "ui",
        "type": "e2e",
        "priority": "medium",
        "result": "passed",
        "effective_result": "passed",
        "run": "",
        "bug": "",
        "file": f"qa/cases/ui/{ident}.e2e.md",
        "hash8": "0a1b2c3d",
        "reqs": [{"id": "REQ-UI-001", "hash8": "1a2b3c4d"}],
        "preconditions": [],
        "steps": [],
        "expected": [],
        "moved_from_e2e": None,
        "test_data": [],
        "legacy": [],
        "checked": "",
        **fields,
    }


def export(*cases: dict[str, Any]) -> dict[str, Any]:
    return {"cases": list(cases)}


class FakeGinQa:
    """Answers by the arguments it is called with; an exception in `outputs` is raised. `delay`
    holds every call that long, so two readers overlap."""

    def __init__(self, outputs: dict[tuple[str, ...], Any], delay: float = 0.0) -> None:
        self.outputs = outputs
        self.delay = delay
        self.calls: list[tuple[list[str], Path]] = []

    def __call__(self, args: list[str], cwd: Path) -> Any:
        self.calls.append((args, cwd))
        if self.delay:
            time.sleep(self.delay)
        answer = self.outputs[tuple(args)]
        if isinstance(answer, Exception):
            raise answer
        return answer
