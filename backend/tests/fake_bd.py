"""A stand-in for the bd runner `run_bd_pull`, so no test starts bd."""

import threading
import time
from pathlib import Path

from gin_console.beads.pull import PullRun


class FakeBd:
    """Records the directory of each call, answers per directory (exit 0 by default), raises an
    answer that is an exception, and counts overlapping calls."""

    def __init__(
        self, answers: dict[Path, PullRun | Exception] | None = None, delay: float = 0.0
    ) -> None:
        self.answers = answers or {}
        self.delay = delay
        self.calls: list[Path] = []
        self.running = 0  # calls in progress, now and at most
        self.peak = 0
        self._lock = threading.Lock()

    def __call__(self, cwd: Path) -> PullRun:
        with self._lock:
            self.calls.append(cwd)
            self.running += 1
            self.peak = max(self.peak, self.running)
        try:
            time.sleep(self.delay)
        finally:
            with self._lock:
                self.running -= 1
        answer = self.answers.get(cwd, PullRun(0, "Pulled.\n"))
        if isinstance(answer, Exception):
            raise answer
        return answer
