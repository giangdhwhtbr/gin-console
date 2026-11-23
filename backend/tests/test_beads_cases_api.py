"""API cases of the Beads capability over HTTP: the export snapshot and its refresh, the stale
export and the pull of each project (REQ-BEADS-005, 012, 013, 016). Beads are read from real
`.beads/issues.jsonl` files; `bd dolt pull` goes to a `FakeBd`."""

import os
import threading
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fake_bd import FakeBd
from fake_export import bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.pull import PullRun
from gin_console.beads.source import read_export
from gin_console.config import ProjectEntry, Settings
from gin_console.projects.collect import CollectError

NO_REMOTE = "Error: fetch from origin/main: Error 1105: no remote"
CONFLICT = (
    "Error: merge origin/main: Error 1105: Merge conflict detected, "
    "@autocommit transaction rolled back."
)


class Clock:
    def __init__(self) -> None:
        self.now = datetime(2026, 11, 12, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.now


class Reads:
    """The real reader, counting its calls."""

    def __init__(self) -> None:
        self.calls: list[Path] = []

    def __call__(self, cwd: Path) -> Any:
        self.calls.append(cwd)
        return read_export(cwd)


def make(
    tmp_path: Path,
    *names: str,
    bd: FakeBd | None = None,
    reads: Reads | None = None,
    clock: Clock | None = None,
    **pull: bool,
) -> TestClient:
    """An app over the projects `names`, each with an export file of one bead (`pull` maps a name
    to its `pull` setting)."""
    (tmp_path / "dist").mkdir(exist_ok=True)
    for name in names:
        write_export(tmp_path / name, [bead(f"{name}-1")])
    settings = Settings(
        projects=[ProjectEntry(name=n, path=tmp_path / n, pull=pull.get(n, True)) for n in names]
    )
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        read_beads=reads or read_export,
        run_bd=bd or FakeBd(),
        clock=clock or Clock(),
        schedule_pulls=False,
    )
    return TestClient(app, raise_server_exceptions=False)


def pulls(api: TestClient) -> dict[str, Any]:
    return {p["name"]: p["pull"] for p in api.get("/api/projects/beads").json()}


def project(api: TestClient, name: str) -> dict[str, Any]:
    return next(p for p in api.get("/api/projects/beads").json() if p["name"] == name)


def export_file(tmp_path: Path, name: str) -> Path:
    return tmp_path / name / ".beads" / "issues.jsonl"


def set_time(path: Path, seconds: int) -> None:
    os.utime(path, ns=(seconds * 10**9, seconds * 10**9))


def manifest(tmp_path: Path, name: str, content: bytes) -> Path:
    path = tmp_path / name / ".beads" / "embeddeddolt" / "db" / ".dolt" / "noms" / "manifest"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


# REQ-BEADS-005 (Projects block)
# TC: TC-BEADS-011@d6cffef2
def test_tc_beads_011_missing_export_file_is_an_error_in_the_projects_block(
    tmp_path: Path,
) -> None:
    make(tmp_path, "Q")  # writes the export file of Q
    (tmp_path / "P").mkdir()
    settings = Settings(
        projects=[
            ProjectEntry(name="P", path=tmp_path / "P"),
            ProjectEntry(name="Q", path=tmp_path / "Q"),
        ]
    )
    api = TestClient(
        create_app(settings, static_dir=tmp_path / "dist", run_bd=FakeBd(), schedule_pulls=False)
    )
    listing = api.get("/api/beads", params={"project": "P"})
    assert listing.status_code == 502
    response = api.get("/api/projects/beads")
    assert response.status_code == 200
    assert project(api, "P")["beads"] == {"error": listing.json()["error"]}
    assert project(api, "Q")["beads"]["open"] == 1


# REQ-BEADS-012 (Unchanged file)
# TC: TC-BEADS-012@e41dbc20
def test_tc_beads_012_unchanged_file_is_not_read_again(tmp_path: Path) -> None:
    reads = Reads()
    api = make(tmp_path, "P", reads=reads)
    set_time(export_file(tmp_path, "P"), 1)
    assert api.get("/api/beads", params={"project": "P"}).status_code == 200
    assert api.get("/api/beads", params={"project": "P"}).status_code == 200
    assert len(reads.calls) == 1


# REQ-BEADS-012 (Changed file)
# TC: TC-BEADS-013@4e611579
def test_tc_beads_013_changed_file_is_read_again(tmp_path: Path) -> None:
    reads = Reads()
    api = make(tmp_path, "P", reads=reads)
    set_time(export_file(tmp_path, "P"), 1)
    before = api.get("/api/beads", params={"project": "P"}).json()
    write_export(tmp_path / "P", [bead("P-1"), bead("P-2")])
    set_time(export_file(tmp_path, "P"), 2)
    after = api.get("/api/beads", params={"project": "P"}).json()
    assert len(reads.calls) == 2
    assert len(before) == 1 and len(after) == 2


# REQ-BEADS-012 (Refresh)
# TC: TC-BEADS-014@a9fffffd
def test_tc_beads_014_refresh_drops_the_snapshot_and_the_report_cache(tmp_path: Path) -> None:
    reads, bd, clock = Reads(), FakeBd(), Clock()
    api = make(tmp_path, "P", bd=bd, reads=reads, clock=clock)
    first = api.get("/api/reports", params={"project": "P"}).json()
    clock.now += timedelta(seconds=10)
    assert api.get("/api/reports", params={"project": "P"}).json() == first  # cached
    assert len(reads.calls) == 1
    assert api.post("/api/refresh").status_code == 204
    assert bd.calls == [tmp_path / "P"]  # pulled before the response
    api.get("/api/beads", params={"project": "P"})
    assert len(reads.calls) == 2  # the file was read again
    again = api.get("/api/reports", params={"project": "P"}).json()
    assert again["generated_at"] != first["generated_at"]  # the report was built again


# REQ-BEADS-013 (Fresh export)
# TC: TC-BEADS-015@c3d2e22c
def test_tc_beads_015_fresh_export_is_not_stale(tmp_path: Path) -> None:
    api = make(tmp_path, "P")
    manifest(tmp_path, "P", b"root-1")
    assert api.get("/api/beads", params={"project": "P"}).status_code == 200  # read at root-1
    assert project(api, "P")["beads"]["stale"] is False


# REQ-BEADS-013 (Project beads without reuse)
# TC: TC-BEADS-016@8a8d7d80
def test_tc_beads_016_write_not_exported_marks_the_beads_stale(tmp_path: Path) -> None:
    api = make(tmp_path, "P")
    path = manifest(tmp_path, "P", b"root-1")
    assert project(api, "P")["beads"]["stale"] is False
    path.write_bytes(b"root-2")  # a bd write that was not exported
    beads = project(api, "P")["beads"]
    assert beads["stale"] is True
    assert beads["open"] == 1  # the counts are those of the file


# REQ-BEADS-013 (Export catches up)
# TC: TC-BEADS-017@b27042e5
def test_tc_beads_017_export_catches_up(tmp_path: Path) -> None:
    reads = Reads()
    api = make(tmp_path, "P", reads=reads)
    path = manifest(tmp_path, "P", b"root-1")
    set_time(export_file(tmp_path, "P"), 1)
    assert project(api, "P")["beads"]["stale"] is False
    path.write_bytes(b"root-2")
    assert project(api, "P")["beads"]["stale"] is True
    count = len(reads.calls)
    write_export(tmp_path / "P", [bead("P-1")])  # bd exports again
    set_time(export_file(tmp_path, "P"), 2)
    assert project(api, "P")["beads"]["stale"] is False
    assert len(reads.calls) == count + 1  # the file was read again


# REQ-BEADS-013 (No manifest)
# TC: TC-BEADS-018@561f2ea8
def test_tc_beads_018_no_manifest_is_never_stale(tmp_path: Path) -> None:
    api = make(tmp_path, "P")
    assert not (tmp_path / "P" / ".beads" / "embeddeddolt").exists()
    assert project(api, "P")["beads"]["stale"] is False


# REQ-BEADS-013 (Project beads without reuse)
# TC: TC-BEADS-019@c3cf051a
def test_tc_beads_019_project_beads_without_reuse(tmp_path: Path) -> None:
    api = make(tmp_path, "P")
    path = manifest(tmp_path, "P", b"root-1")
    assert api.get("/api/beads", params={"project": "P"}).status_code == 200
    path.write_bytes(b"root-2")
    assert project(api, "P")["beads"]["stale"] is True


# REQ-BEADS-016 (Pull each project)
# TC: TC-BEADS-043@15c42931
def test_tc_beads_043_pull_each_project(tmp_path: Path) -> None:
    bd = FakeBd()
    api = make(tmp_path, "A", "B", bd=bd)
    assert api.post("/api/refresh").status_code == 204
    assert sorted(bd.calls) == [tmp_path / "A", tmp_path / "B"]
    for name, result in pulls(api).items():
        assert result["status"] == "ok", name
        assert result["at"] and result["error"] is None


# REQ-BEADS-016 (Four at a time)
# TC: TC-BEADS-044@db18ecc7
def test_tc_beads_044_four_at_a_time(tmp_path: Path) -> None:
    names = [f"p{n}" for n in range(6)]
    bd = FakeBd(delay=0.05)
    api = make(tmp_path, *names, bd=bd)
    assert api.post("/api/refresh").status_code == 204
    assert 1 < bd.peak <= 4
    assert sorted(bd.calls) == [tmp_path / n for n in names]


# REQ-BEADS-016 (Opted out or missing)
# TC: TC-BEADS-045@7b27acea
def test_tc_beads_045_opted_out_or_missing(tmp_path: Path) -> None:
    bd = FakeBd()
    write_export(tmp_path / "A", [bead("A-1")])
    (tmp_path / "dist").mkdir()
    settings = Settings(
        projects=[
            ProjectEntry(name="A", path=tmp_path / "A", pull=False),
            ProjectEntry(name="B", path=tmp_path / "B"),  # no directory
        ]
    )
    api = TestClient(
        create_app(settings, static_dir=tmp_path / "dist", run_bd=bd, schedule_pulls=False)
    )
    assert api.post("/api/refresh").status_code == 204
    assert bd.calls == []
    assert pulls(api) == {"A": None, "B": None}


# REQ-BEADS-016 (No remote)
# TC: TC-BEADS-046@0044738b
def test_tc_beads_046_no_remote(tmp_path: Path) -> None:
    bd = FakeBd({tmp_path / "A": PullRun(1, f"{NO_REMOTE}\n")})
    api = make(tmp_path, "A", bd=bd)
    assert api.post("/api/refresh").status_code == 204
    assert pulls(api)["A"]["status"] == "no_remote"


# REQ-BEADS-016 (Merge conflict)
# TC: TC-BEADS-047@b43d7323
def test_tc_beads_047_merge_conflict(tmp_path: Path) -> None:
    bd = FakeBd({tmp_path / "A": PullRun(1, f"Fetching origin\n{CONFLICT}\n")})
    api = make(tmp_path, "A", "B", bd=bd)
    assert api.post("/api/refresh").status_code == 204
    result = pulls(api)
    assert (result["A"]["status"], result["A"]["error"]) == ("error", CONFLICT)
    assert result["B"]["status"] == "ok"


# REQ-BEADS-016 (Timeout)
# TC: TC-BEADS-048@e33890b0
def test_tc_beads_048_timeout(tmp_path: Path) -> None:
    bd = FakeBd({tmp_path / "A": CollectError("bd timed out")})  # what run_bd_pull raises at 30 s
    api = make(tmp_path, "A", bd=bd)
    assert api.post("/api/refresh").status_code == 204
    result = pulls(api)["A"]
    assert (result["status"], result["error"]) == ("error", "bd dolt pull timed out")


# REQ-BEADS-016 (One pull at a time per project)
# TC: TC-BEADS-049@e146ea67
def test_tc_beads_049_one_pull_at_a_time_per_project(tmp_path: Path) -> None:
    bd = FakeBd(delay=0.3)
    api = make(tmp_path, "A", bd=bd)
    codes: list[int] = []

    def refresh() -> None:
        codes.append(TestClient(api.app).post("/api/refresh").status_code)

    first = threading.Thread(target=refresh)
    first.start()
    deadline = datetime.now() + timedelta(seconds=2)
    while bd.running == 0 and datetime.now() < deadline:
        pass
    refresh()  # a second refresh while the first pull of A runs
    first.join()
    assert codes == [204, 204]
    assert bd.calls == [tmp_path / "A"]
    assert pulls(api)["A"]["status"] == "ok"
