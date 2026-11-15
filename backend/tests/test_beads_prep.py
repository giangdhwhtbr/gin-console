from pathlib import Path
from typing import Any

import pytest
from fake_export import FakeExport, bead, dep, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.prep import is_prep
from gin_console.beads.snapshot import SnapshotStore
from gin_console.beads.source import read_export
from gin_console.config import ProjectEntry, Settings
from gin_console.projects.models import BlockError
from gin_console.projects.source import count_beads


@pytest.mark.parametrize(
    ("labels", "expected"),
    [
        (["prep"], True),
        (["prep", "prep:mockup"], True),
        (["prep", "track:api"], False),
        (["prep", "req:REQ-1"], False),
        (["track:api"], False),
        ([], False),
    ],
)
def test_beads_002_is_prep(labels: list[str], expected: bool) -> None:
    assert is_prep(labels) is expected


def child(ident: str, parent: str, **fields: Any) -> dict[str, Any]:
    return bead(ident, dependencies=[dep(ident, parent, "parent-child")], **fields)


# REQ-BEADS-002
def test_beads_002_prep_child(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic"),
        child("t-1", "e-1"),
        child("t-2", "e-1"),
        child("p-1", "e-1", labels=["prep", "prep:mockup"]),
        child("t-3", "e-1", labels=["prep", "track:api"]),
    ]
    (tmp_path / "proj").mkdir()
    (tmp_path / "dist").mkdir()
    write_export(tmp_path / "proj", [])
    app = create_app(
        Settings(projects=[ProjectEntry(name="proj", path=tmp_path / "proj")]),
        static_dir=tmp_path / "dist",
        claude_home=tmp_path,
        read_beads=FakeExport(rows),
    )
    body = TestClient(app).get("/api/beads/proj/e-1").json()
    assert {c["id"]: c["prep"] for c in body["children"]} == {
        "t-1": False,
        "t-2": False,
        "p-1": True,
        "t-3": False,
    }


def counts(tmp_path: Path, rows: list[Any]) -> Any:
    write_export(tmp_path, rows)
    result = count_beads(SnapshotStore(read_export), tmp_path)
    assert not isinstance(result, BlockError)
    return result


# REQ-SERVER-006
def test_server_006_prep_tasks_counted_apart(tmp_path: Path) -> None:
    rows = [
        bead("e-1", issue_type="epic", status="in_progress"),
        child("t-1", "e-1"),
        child("t-2", "e-1"),
        child("p-1", "e-1", labels=["prep", "prep:mockup"]),
        child("p-2", "e-1", status="closed", labels=["prep"]),
    ]
    beads = counts(tmp_path, rows)
    assert (beads.open, beads.in_progress, beads.ready, beads.blocked, beads.prep) == (
        2,
        1,
        2,
        0,
        1,
    )
    assert [e.id for e in beads.epics] == ["e-1"]


# REQ-SERVER-006
def test_server_006_blocked_prep_task_is_not_blocked(tmp_path: Path) -> None:
    rows = [
        bead("t-1"),
        bead("p-1", labels=["prep"], dependencies=[dep("p-1", "t-1", "blocks")]),
    ]
    beads = counts(tmp_path, rows)
    assert (beads.open, beads.blocked, beads.ready, beads.prep) == (1, 0, 1, 1)
