import logging
import subprocess
import threading
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd
from fake_export import FakeExport, bead, write_export
from fastapi.testclient import TestClient

from gin_console.app import create_app
from gin_console.beads.pull import (
    PULL_TIMEOUT_SECONDS,
    SCHEDULER_THREAD,
    PullRun,
    PullScheduler,
    PullService,
    run_bd_pull,
)
from gin_console.config import BeadsSettings, ProjectEntry, Settings
from gin_console.projects.collect import CollectError
from gin_console.projects.models import PullResult

NOW = datetime(2026, 11, 19, 4, 0, tzinfo=UTC)
NO_REMOTE = "Error: fetch from origin/main: Error 1105: no remote"
CONFLICT = (
    "Error: merge origin/main: Error 1105: Merge conflict detected, "
    "@autocommit transaction rolled back."
)


def projects(tmp_path: Path, *names: str, **pull: bool) -> list[ProjectEntry]:
    """An existing directory per name; `pull` maps a name to its `pull` setting."""
    entries = []
    for name in names:
        (tmp_path / name).mkdir(exist_ok=True)
        entries.append(ProjectEntry(name=name, path=tmp_path / name, pull=pull.get(name, True)))
    return entries


def service(entries: list[ProjectEntry], fake: FakeBd) -> PullService:
    return PullService(entries, fake, lambda: NOW)


def until(done: Callable[[], bool], timeout: float = 2.0) -> None:
    deadline = time.monotonic() + timeout
    while not done():
        assert time.monotonic() < deadline, "timed out waiting"
        time.sleep(0.005)


def scheduler_alive() -> bool:
    return any(t.name == SCHEDULER_THREAD and t.is_alive() for t in threading.enumerate())


# REQ-BEADS-016 (Pull each project)
def test_beads_016_pull_each_project(tmp_path: Path) -> None:
    fake = FakeBd()
    pulls = service(projects(tmp_path, "a", "b"), fake)
    ok = PullResult(at=NOW, status="ok", error=None)
    assert pulls.pull_all() == {"a": ok, "b": ok}
    assert sorted(fake.calls) == [tmp_path / "a", tmp_path / "b"]
    assert pulls.result("a") == ok and pulls.result("b") == ok


# REQ-BEADS-016: the last pull's result is kept, and `at` is when it ended
def test_beads_016_result_of_the_last_pull_is_kept(tmp_path: Path) -> None:
    times = iter([NOW, NOW.replace(hour=5)])
    fake = FakeBd({tmp_path / "a": PullRun(1, CONFLICT)})
    pulls = PullService(projects(tmp_path, "a"), fake, lambda: next(times))
    assert pulls.result("a") is None  # not pulled since start
    pulls.pull_all()
    fake.answers = {}
    pulls.pull_all()
    assert pulls.result("a") == PullResult(at=NOW.replace(hour=5), status="ok", error=None)


# REQ-BEADS-016 (Four at a time)
def test_beads_016_four_at_a_time(tmp_path: Path) -> None:
    names = [f"p{n}" for n in range(6)]
    fake = FakeBd(delay=0.05)
    results = service(projects(tmp_path, *names), fake).pull_all()
    assert sorted(results) == names and len(fake.calls) == 6
    assert 1 < fake.peak <= 4


# REQ-BEADS-016: the limit holds for the whole server, not per pull_all
def test_beads_016_four_at_a_time_across_runs(tmp_path: Path) -> None:
    fake = FakeBd(delay=0.05)
    pulls = service(projects(tmp_path, *[f"p{n}" for n in range(6)]), fake)
    other = threading.Thread(target=pulls.pull_all)
    other.start()
    pulls.pull_all()
    other.join()
    assert fake.peak <= 4


# REQ-BEADS-016 (Opted out or missing)
def test_beads_016_opted_out_or_missing_is_not_pulled(tmp_path: Path) -> None:
    entries = [
        *projects(tmp_path, "a", "c", a=False),
        ProjectEntry(name="b", path=tmp_path / "b"),  # no directory
    ]
    fake = FakeBd()
    pulls = service(entries, fake)
    assert list(pulls.pull_all()) == ["c"]
    assert fake.calls == [tmp_path / "c"]
    assert pulls.result("a") is None and pulls.result("b") is None


# REQ-BEADS-016 (No remote)
def test_beads_016_no_remote(tmp_path: Path) -> None:
    fake = FakeBd({tmp_path / "a": PullRun(1, f"{NO_REMOTE}\n")})
    result = service(projects(tmp_path, "a"), fake).pull_all()["a"]
    assert (result.status, result.error) == ("no_remote", None)


# REQ-BEADS-016 (Merge conflict)
def test_beads_016_merge_conflict_keeps_the_last_line(tmp_path: Path) -> None:
    fake = FakeBd({tmp_path / "a": PullRun(1, f"Fetching origin\n{CONFLICT}\n\n")})
    results = service(projects(tmp_path, "a", "b"), fake).pull_all()
    assert (results["a"].status, results["a"].error) == ("error", CONFLICT)
    assert (results["b"].status, results["b"].error) == ("ok", None)


# REQ-BEADS-016: a failure without output still says what failed
def test_beads_016_failure_without_output(tmp_path: Path) -> None:
    fake = FakeBd({tmp_path / "a": PullRun(2, "\n")})
    result = service(projects(tmp_path, "a"), fake).pull_all()["a"]
    assert (result.status, result.error) == ("error", "bd dolt pull exited 2")


# REQ-BEADS-016 (Timeout), and bd missing
@pytest.mark.parametrize(
    ("failure", "error"),
    [
        (CollectError("bd timed out"), "bd dolt pull timed out"),
        (CollectError("bd not found"), "bd not found"),
        (CollectError("bd failed: Permission denied"), "bd failed: Permission denied"),
    ],
)
def test_beads_016_runner_failures(tmp_path: Path, failure: CollectError, error: str) -> None:
    fake = FakeBd({tmp_path / "a": failure})
    pulls = service(projects(tmp_path, "a"), fake)
    assert pulls.pull_all()["a"] == PullResult(at=NOW, status="error", error=error)


# REQ-BEADS-016: an unexpected runner error is that project's failed pull, logged, not raised
def test_beads_016_unexpected_runner_error_is_a_failed_pull(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    fake = FakeBd({tmp_path / "a": RuntimeError("boom")})
    with caplog.at_level(logging.ERROR, logger="gin_console.beads.pull"):
        results = service(projects(tmp_path, "a", "b"), fake).pull_all()
    assert results["a"] == PullResult(at=NOW, status="error", error="bd dolt pull failed")
    assert results["b"].status == "ok"
    [record] = caplog.records
    assert record.getMessage() == f"bd dolt pull in {tmp_path / 'a'} failed"
    assert record.exc_info is not None and str(record.exc_info[1]) == "boom"


# REQ-BEADS-016 (Timeout): the default runner stops bd after 30 seconds
@pytest.mark.parametrize(
    ("raised", "error"),
    [
        (subprocess.TimeoutExpired(["bd"], PULL_TIMEOUT_SECONDS), "bd dolt pull timed out"),
        (FileNotFoundError(), "bd not found"),
    ],
)
def test_beads_016_default_runner_timeout_and_missing_bd(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, raised: Exception, error: str
) -> None:
    seen: list[dict[str, Any]] = []

    def run(cmd: list[str], **kwargs: Any) -> None:
        seen.append({"cmd": cmd, **kwargs})
        raise raised

    monkeypatch.setattr(subprocess, "run", run)
    pulls = PullService(projects(tmp_path, "a"), run_bd_pull, lambda: NOW)
    assert pulls.pull_all()["a"] == PullResult(at=NOW, status="error", error=error)
    assert seen[0]["cmd"] == ["bd", "dolt", "pull"] and seen[0]["cwd"] == tmp_path / "a"
    assert seen[0]["timeout"] == PULL_TIMEOUT_SECONDS == 30


# REQ-BEADS-016: the default runner joins stdout and stderr
def test_beads_016_default_runner_joins_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    def run(cmd: list[str], **kwargs: Any) -> "subprocess.CompletedProcess[str]":
        return subprocess.CompletedProcess(cmd, 1, "Fetching origin\n", f"{CONFLICT}\n")

    monkeypatch.setattr(subprocess, "run", run)
    assert run_bd_pull(tmp_path) == PullRun(1, f"Fetching origin\n\n{CONFLICT}\n")


# REQ-BEADS-016 (One pull at a time per project)
def test_beads_016_one_pull_at_a_time_per_project(tmp_path: Path) -> None:
    fake = FakeBd(delay=0.2)
    pulls = service(projects(tmp_path, "a"), fake)
    first: dict[str, PullResult] = {}
    running = threading.Thread(target=lambda: first.update(pulls.pull_all()))
    running.start()
    until(lambda: fake.running == 1)
    second = pulls.pull_all()  # starts while the first pull of A runs
    running.join()
    assert fake.calls == [tmp_path / "a"]
    assert second["a"] is first["a"]


# REQ-BEADS-017 (Failed scheduled pull logged)
def test_beads_017_run_once_pulls_logs_failures_then_drops_caches(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    events: list[str] = []
    fake = FakeBd({tmp_path / "a": PullRun(1, CONFLICT), tmp_path / "b": PullRun(1, NO_REMOTE)})
    pulls = service(projects(tmp_path, "a", "b", "c"), fake)
    scheduler = PullScheduler(pulls, 300, after=lambda: events.append(f"after {len(fake.calls)}"))
    with caplog.at_level(logging.WARNING, logger="gin_console.beads.pull"):
        scheduler.run_once()
    assert events == ["after 3"]  # the caches are dropped once every pull has ended
    assert [r.getMessage() for r in caplog.records] == [f"pull of a failed: {CONFLICT}"]
    assert caplog.records[0].levelno == logging.WARNING
    result = pulls.result("a")
    assert result is not None and result.status == "error"


# REQ-BEADS-017 (Every interval)
def test_beads_017_pulls_an_interval_after_start_and_after_each_pull(tmp_path: Path) -> None:
    interval = 0.05
    marks: list[tuple[str, float]] = []
    fake = FakeBd(delay=0.03)

    def run(cwd: Path) -> PullRun:
        marks.append(("pull", time.monotonic()))
        answer = fake(cwd)
        marks.append(("ended", time.monotonic()))
        return answer

    pulls = PullService(projects(tmp_path, "a"), run, lambda: NOW)
    scheduler = PullScheduler(pulls, interval, after=lambda: marks.append(("after", 0.0)))
    started = time.monotonic()
    scheduler.start()
    until(lambda: [m for m, _ in marks].count("after") >= 2)
    scheduler.stop()
    kinds = [m for m, _ in marks]
    assert kinds[:6] == ["pull", "ended", "after", "pull", "ended", "after"]
    assert marks[0][1] - started >= interval * 0.9
    assert marks[3][1] - marks[1][1] >= interval * 0.9  # counted from the end of the last pull


# REQ-BEADS-017: stop ends the thread and no pull follows
def test_beads_017_stop_ends_the_thread(tmp_path: Path) -> None:
    fake = FakeBd()
    scheduler = PullScheduler(service(projects(tmp_path, "a"), fake), 0.02, after=lambda: None)
    scheduler.start()
    until(lambda: len(fake.calls) >= 1)
    scheduler.stop()
    assert not scheduler_alive()
    calls = len(fake.calls)
    time.sleep(0.1)
    assert len(fake.calls) == calls


# REQ-BEADS-017: an unexpected error in one run is logged and the next run still happens
def test_beads_017_an_error_in_a_run_does_not_stop_the_schedule(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    fake = FakeBd()
    afters: list[int] = []

    def after() -> None:
        afters.append(len(fake.calls))
        if len(afters) == 1:
            raise RuntimeError("boom")

    scheduler = PullScheduler(service(projects(tmp_path, "a"), fake), 0.02, after=after)
    with caplog.at_level(logging.ERROR, logger="gin_console.beads.pull"):
        scheduler.start()
        until(lambda: len(afters) >= 2)
        scheduler.stop()
    assert afters[:2] == [1, 2]  # the first run raised in `after`; the next run still came
    [record] = [r for r in caplog.records if r.exc_info]
    assert record.getMessage() == "scheduled pull failed"
    assert record.exc_info is not None and str(record.exc_info[1]) == "boom"


# REQ-BEADS-017: an interval past the longest thread wait still waits instead of ending the thread
def test_beads_017_interval_beyond_the_longest_wait(tmp_path: Path) -> None:
    fake = FakeBd()
    scheduler = PullScheduler(
        service(projects(tmp_path, "a"), fake), threading.TIMEOUT_MAX * 10, after=lambda: None
    )
    scheduler.start()
    time.sleep(0.05)
    assert scheduler_alive()
    scheduler.stop()
    assert not scheduler_alive() and fake.calls == []


def app_client(
    tmp_path: Path, fake: FakeBd, reads: FakeExport, beads: BeadsSettings, schedule: bool = True
) -> TestClient:
    write_export(tmp_path / "proj", [])
    (tmp_path / "dist").mkdir(exist_ok=True)
    settings = Settings(beads=beads, projects=[ProjectEntry(name="proj", path=tmp_path / "proj")])
    app = create_app(
        settings,
        static_dir=tmp_path / "dist",
        read_beads=reads,
        run_bd=fake,
        schedule_pulls=schedule,
        clock=lambda: NOW,
    )
    return TestClient(app)


# REQ-BEADS-017 (Every interval): each scheduled pull drops the snapshots
def test_beads_017_scheduled_pull_drops_the_snapshots(tmp_path: Path) -> None:
    fake, reads = FakeBd(), FakeExport([bead("a-1")])
    # 50 ms instead of the one-minute minimum, which only the config file enforces
    beads = BeadsSettings.model_construct(pull_interval=0.05)
    with app_client(tmp_path, fake, reads, beads) as api:
        assert scheduler_alive()
        api.get("/api/beads", params={"project": "proj"})
        assert len(reads.calls) == 1
        until(lambda: len(fake.calls) >= 2)  # the first scheduled pull and its clear are done
        api.get("/api/beads", params={"project": "proj"})
        assert len(reads.calls) == 2
        status = api.get("/api/projects/beads").json()[0]["pull"]["status"]
        assert status == "ok"
    assert not scheduler_alive()  # stopped on shutdown


# REQ-BEADS-017 (Off by default), REQ-CONFIG-006 (Defaults)
@pytest.mark.parametrize("schedule", [True, False])
def test_beads_017_off_without_the_setting(tmp_path: Path, schedule: bool) -> None:
    fake = FakeBd()
    with app_client(tmp_path, fake, FakeExport([]), BeadsSettings(), schedule):
        time.sleep(0.1)
        assert not scheduler_alive()
    assert fake.calls == []


# REQ-BEADS-017: tests can keep the scheduler off even when the config sets an interval
def test_beads_017_schedule_pulls_false_keeps_it_off(tmp_path: Path) -> None:
    fake = FakeBd()
    beads = BeadsSettings.model_construct(pull_interval=0.02)
    with app_client(tmp_path, fake, FakeExport([]), beads, schedule=False):
        time.sleep(0.1)
        assert not scheduler_alive()
    assert fake.calls == []
