"""`bd dolt pull` in each configured project: the one bd command the console runs (ADR 0003),
followed by the fetch of the shared attachment store (ADR 0006).

`PullService` runs the pulls, at most four at a time over the whole server and never two of one
project at once, and keeps each project's last pull and fetch result; `PullScheduler` pulls on an
interval.
"""

import logging
import threading
from collections.abc import Callable, Collection, Sequence
from concurrent.futures import Future, ThreadPoolExecutor, wait
from datetime import datetime
from pathlib import Path
from typing import NamedTuple, Protocol

from gin_console.beads.attachments import GitError, GitRunner
from gin_console.config import ProjectEntry
from gin_console.projects.collect import CollectError, _run
from gin_console.projects.models import FetchResult, PullResult

PULL_TIMEOUT_SECONDS = 30.0
PULL_WORKERS = 4
FETCH_ARGS = (
    "fetch",
    "--quiet",
    "--no-write-fetch-head",
    "origin",
    "+refs/gin/attachments:refs/gin-console/attachments",
)
SCHEDULER_THREAD = "beads-pull-scheduler"

logger = logging.getLogger(__name__)


class PullRun(NamedTuple):
    returncode: int
    output: str  # stdout and stderr joined


class BdRunner(Protocol):
    """Runs `bd dolt pull` in `cwd`; raises CollectError on a timeout or a missing command."""

    def __call__(self, cwd: Path) -> PullRun: ...


def run_bd_pull(cwd: Path) -> PullRun:
    done = _run(["bd", "dolt", "pull"], cwd, PULL_TIMEOUT_SECONDS)
    return PullRun(done.returncode, f"{done.stdout}\n{done.stderr}")


class PullService:
    def __init__(
        self,
        projects: Sequence[ProjectEntry],
        run_bd: BdRunner,
        clock: Callable[[], datetime],
        run_git: GitRunner | None = None,
    ) -> None:
        self._projects = list(projects)
        self._run_bd = run_bd
        self._run_git = run_git
        self._clock = clock
        self._pool = ThreadPoolExecutor(max_workers=PULL_WORKERS, thread_name_prefix="bd-pull")
        self._guard = threading.Lock()  # over _running and _results
        self._running: dict[str, Future[PullResult]] = {}
        self._results: dict[str, PullResult] = {}
        self._fetches: dict[str, FetchResult] = {}

    def pull_all(self, names: Collection[str] | None = None) -> dict[str, PullResult]:
        """Pull every project, or those of `names` when given, that exists and does not opt
        out; return when all have ended."""
        futures = {
            entry.name: self._start(entry)
            for entry in self._projects
            if (names is None or entry.name in names) and entry.pull and entry.path.is_dir()
        }
        wait(futures.values())
        return {name: future.result() for name, future in futures.items()}

    def result(self, name: str) -> PullResult | None:
        with self._guard:
            return self._results.get(name)

    def fetch_result(self, name: str) -> FetchResult | None:
        with self._guard:
            return self._fetches.get(name)

    def fetch_results(self, names: Collection[str]) -> dict[str, FetchResult]:
        with self._guard:
            return {name: self._fetches[name] for name in names if name in self._fetches}

    def _start(self, entry: ProjectEntry) -> Future[PullResult]:
        """The running pull of this project, or a new one."""
        with self._guard:
            future = self._running.get(entry.name)
            if future is None:
                future = self._pool.submit(self._pull, entry)
                self._running[entry.name] = future
            return future

    def _pull(self, entry: ProjectEntry) -> PullResult:
        result: PullResult | None = None
        fetch: FetchResult | None = None
        try:
            result = self._outcome(entry.path)
            if self._run_git is not None:  # whatever the pull's result was
                fetch = self._fetch_outcome(self._run_git, entry.path)
            return result
        finally:
            # kept before the future resolves, so a caller of pull_all finds them in result()
            # and fetch_result()
            with self._guard:
                del self._running[entry.name]
                if result is not None:
                    self._results[entry.name] = result
                if fetch is not None:
                    self._fetches[entry.name] = fetch

    def _fetch_outcome(self, run_git: GitRunner, path: Path) -> FetchResult:
        try:
            run = run_git(FETCH_ARGS, path)
        except GitError as exc:
            message = str(exc)
            # run_git words its timeout "git timed out"; the fetch names itself
            error = "git fetch timed out" if message.endswith("timed out") else message
            return FetchResult(at=self._clock(), status="error", error=error)
        except Exception:  # a failed fetch never fails the refresh or the scheduled run
            logger.exception("git fetch in %s failed", path)
            return FetchResult(at=self._clock(), status="error", error="git fetch failed")
        if run.returncode == 0:
            return FetchResult(at=self._clock(), status="ok")
        if "couldn't find remote ref" in run.stderr:
            return FetchResult(at=self._clock(), status="no_store")
        if "does not appear to be a git repository" in run.stderr:
            return FetchResult(at=self._clock(), status="no_remote")
        lines = [line.strip() for line in run.stderr.splitlines() if line.strip()]
        error = lines[-1] if lines else f"git fetch exited {run.returncode}"
        return FetchResult(at=self._clock(), status="error", error=error)

    def _outcome(self, path: Path) -> PullResult:
        try:
            run = self._run_bd(path)
        except CollectError as exc:
            message = str(exc)
            error = "bd dolt pull timed out" if message.endswith("timed out") else message
            return PullResult(at=self._clock(), status="error", error=error)
        except Exception:  # a failed pull never fails the refresh or the scheduled run
            logger.exception("bd dolt pull in %s failed", path)
            return PullResult(at=self._clock(), status="error", error="bd dolt pull failed")
        if run.returncode == 0:
            return PullResult(at=self._clock(), status="ok")
        if "no remote" in run.output.lower():
            return PullResult(at=self._clock(), status="no_remote")
        lines = [line.strip() for line in run.output.splitlines() if line.strip()]
        error = lines[-1] if lines else f"bd dolt pull exited {run.returncode}"
        return PullResult(at=self._clock(), status="error", error=error)


class PullScheduler:
    """Pulls `interval` seconds after start and again `interval` seconds after each run ends."""

    def __init__(self, service: PullService, interval: float, after: Callable[[], None]) -> None:
        self._service = service
        self._interval = interval
        self._after = after
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def run_once(self) -> None:
        """Pull every project, log each failure, then run `after` (drop the caches)."""
        pulled = self._service.pull_all()
        for name, result in pulled.items():
            if result.status == "error":
                logger.warning("pull of %s failed: %s", name, result.error)
        for name, fetch in self._service.fetch_results(pulled).items():
            if fetch.status == "error":
                logger.warning("attachment fetch of %s failed: %s", name, fetch.error)
        self._after()

    def start(self) -> None:
        self._thread = threading.Thread(target=self._loop, name=SCHEDULER_THREAD, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join()

    def _loop(self) -> None:
        while not self._stop.wait(min(self._interval, threading.TIMEOUT_MAX)):
            try:
                self.run_once()
            except Exception:
                logger.exception("scheduled pull failed")
