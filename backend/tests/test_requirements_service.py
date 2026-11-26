from typing import Any

import pytest
from fake_gin import req, trace

from gin_console.requirements.models import Trace
from gin_console.requirements.service import build_list

DONE = [{"id": "a-1", "title": "A", "status": "closed"}]
OPEN = [{"id": "a-1", "title": "A", "status": "open"}]


def cases(*results: str) -> list[dict[str, str]]:
    return [{"id": f"TC-AUTH-{n:03d}", "effective_result": r} for n, r in enumerate(results, 1)]


def listing(*rows: dict[str, Any], **fields: Any) -> Any:
    return build_list(Trace.model_validate(trace(*rows, **fields)))


# REQ-REQUIREMENTS-002
@pytest.mark.parametrize(
    ("fields", "status", "reasons"),
    [
        ({"beads": DONE, "cases": cases("passed", "passed")}, "covered", []),
        ({"cases": cases("passed", "outdated")}, "untested", ["outdated"]),
        ({"cases": [], "tests": ["t.py"]}, "untested", ["no case"]),
        ({"beads": OPEN, "cases": cases("failed")}, "failing", ["failed"]),
        ({"beads": DONE, "cases": None}, "unknown", ["cases unknown"]),
        ({"beads": OPEN, "cases": None}, "building", ["open beads"]),
        ({"beads": None, "cases": cases("passed")}, "covered", []),
        ({"state": "proposed"}, "building", ["proposed"]),
        ({"cases": cases("blocked")}, "untested", ["blocked"]),
        ({"state": "removed", "hash8": None, "source": None}, None, []),
    ],
)
def test_requirements_002_status(
    fields: dict[str, Any], status: str | None, reasons: list[str]
) -> None:
    row = listing(req(**fields)).requirements[0]
    assert (row.status, row.reasons) == (status, reasons)


# REQ-REQUIREMENTS-001: living and removed
def test_requirements_001_living_and_removed() -> None:
    out = listing(
        req("REQ-AUTH-001", cases=cases("passed")),
        req("REQ-AUTH-002", state="removed"),
    )
    assert [(r.state, r.status) for r in out.requirements] == [
        ("living", "covered"),
        ("removed", None),
    ]


# REQ-REQUIREMENTS-001: trace warning, null beads stay null
def test_requirements_001_warning_keeps_null() -> None:
    out = listing(req(beads=None), warnings=["beads: bd exited 1"])
    assert out.requirements[0].beads is None
    assert out.warnings == ["beads: bd exited 1"]


# REQ-REQUIREMENTS-001: legacy layout
def test_requirements_001_legacy_layout() -> None:
    out = listing(layout="legacy")
    assert out.layout == "legacy" and out.requirements == []


# REQ-REQUIREMENTS-003
@pytest.mark.parametrize(
    ("signoff", "state"),
    [
        (None, "none"),
        ({"actor": "ba", "at": "t", "change": "c", "current": False}, "changed"),
        ({"actor": "ba", "current": None}, "unknown version"),
        ({"actor": "ba", "waived": True, "evidence": "legacy", "current": None}, "waived"),
        ({"actor": "ba", "current": True}, "current"),
    ],
)
def test_requirements_003_signoff(signoff: dict[str, Any] | None, state: str) -> None:
    row = listing(req(signoff=signoff)).requirements[0]
    assert row.signoff.state == state
    if signoff:
        assert row.signoff.actor == "ba"
    if state == "changed":
        assert (row.signoff.at, row.signoff.change) == ("t", "c")
    if state == "waived":
        assert row.signoff.evidence == "legacy"
