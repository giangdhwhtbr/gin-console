"""A stand-in for the git runner `run_git`, so no test starts git."""

import threading
import time
from collections.abc import Iterable, Sequence
from pathlib import Path

from gin_console.beads.attachments import GitRun

UNKNOWN = GitRun(128, b"", "fatal: unknown")


class FakeGit:
    """Records the directory and arguments of each call, answers per (directory, arguments)
    (`UNKNOWN` by default, as git does for a missing ref), raises an answer that is an exception,
    and counts overlapping calls."""

    def __init__(
        self,
        answers: dict[tuple[Path, tuple[str, ...]], GitRun | Exception] | None = None,
        delay: float = 0.0,
    ) -> None:
        self.answers = answers or {}
        self.delay = delay
        self.calls: list[tuple[Path, tuple[str, ...]]] = []
        self.running = 0  # calls in progress, now and at most
        self.peak = 0
        self._lock = threading.Lock()

    def __call__(self, args: Sequence[str], cwd: Path) -> GitRun:
        key = (cwd, tuple(args))
        with self._lock:
            self.calls.append(key)
            self.running += 1
            self.peak = max(self.peak, self.running)
        try:
            time.sleep(self.delay)
        finally:
            with self._lock:
                self.running -= 1
        answer = self.answers.get(key, UNKNOWN)
        if isinstance(answer, Exception):
            raise answer
        return answer

    def listing(self, cwd: Path, ref: str, paths: Iterable[str]) -> None:
        """`ref` exists in `cwd` and holds the blobs `paths`."""
        out = "".join(f"{path}\n" for path in paths).encode()
        self.answers[(cwd, ("ls-tree", "-r", "--name-only", ref))] = GitRun(0, out, "")

    def blob(self, cwd: Path, ref: str, sha: str, data: bytes) -> None:
        """`ref` in `cwd` holds `data` at `<aa>/<sha>`, for `cat-file -s` and `cat-file blob`."""
        name = f"{ref}:{sha[:2]}/{sha}"
        self.answers[(cwd, ("cat-file", "-s", name))] = GitRun(0, f"{len(data)}\n".encode(), "")
        self.answers[(cwd, ("cat-file", "blob", name))] = GitRun(0, data, "")
