"""Guard: no test starts a real git process (tests use `FakeGit`)."""

import subprocess
from collections.abc import Iterator
from typing import Any

import pytest


@pytest.fixture(autouse=True)
def no_real_git(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """`run_git` catches errors, so a refused call is recorded and fails the test at teardown."""
    real = subprocess.run
    started: list[Any] = []

    def run(cmd: Any, *args: Any, **kwargs: Any) -> Any:
        if isinstance(cmd, (list, tuple)) and cmd and cmd[0] == "git":
            started.append(cmd)
            raise AssertionError("tests must not start git")
        return real(cmd, *args, **kwargs)

    monkeypatch.setattr(subprocess, "run", run)
    yield
    assert not started, f"tests must not start git: {started}"
