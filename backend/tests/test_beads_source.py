import os
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd, bead, related

from gin_console.beads.source import (
    BeadNotFound,
    BeadsError,
    get_bead,
    list_beads,
    run_bd,
    valid_id,
)

CWD = Path("/tmp/project")


# REQ-BEADS-001
def test_beads_001_list_arguments_and_closed_flag() -> None:
    fake = FakeBd([bead("a-1"), bead("a-2", status="closed")])
    assert [b.id for b in list_beads(fake, CWD, closed=False)] == ["a-1"]
    assert fake.calls[0] == (["list", "--limit", "0", "--json"], CWD)
    assert [b.id for b in list_beads(fake, CWD, closed=True)] == ["a-1", "a-2"]
    assert fake.calls[3][0] == ["list", "--limit", "0", "--json", "--all"]


# REQ-BEADS-001
def test_beads_001_optional_fields_default() -> None:
    (summary,) = list_beads(FakeBd([bead("a-1")]), CWD, closed=False)
    assert (summary.labels, summary.assignee, summary.parent) == ([], None, None)
    assert summary.priority == 2 and summary.comment_count == 0


# REQ-BEADS-005
def test_beads_005_a_malformed_bead_is_left_out_of_the_list() -> None:
    fake = FakeBd(
        [
            bead("a-1"),
            bead("a-2", title=7),
            bead("a-3", priority="high"),
            bead("a-4", priority=True),
            "x",
        ]
    )
    assert [b.id for b in list_beads(fake, CWD, closed=False)] == ["a-1"]


# REQ-BEADS-005
@pytest.mark.parametrize("output", [{"x": 1}, "text", 5])
def test_beads_005_unexpected_list_output(output: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        list_beads(FakeBd(output=output), CWD, closed=False)


# REQ-BEADS-002
def test_beads_002_detail_relations() -> None:
    shown = bead(
        "a-5",
        description="Why and what",
        parent="a-1",
        dependencies=[
            related("a-4", "blocks"),
            related("a-1", "parent-child"),
            related("z", "relates_to"),
        ],
    )
    up = {"a-5": [related("a-6", "blocks"), related("a-7", "parent-child", status="closed")]}
    detail = get_bead(FakeBd(shown={"a-5": shown}, up=up), CWD, "a-5")
    assert detail.description == "Why and what"
    assert [(r.id, r.type) for r in detail.dependencies] == [
        ("a-4", "blocks"),
        ("a-1", "parent-child"),
    ]
    assert [r.id for r in detail.dependents] == ["a-6"]
    assert [(r.id, r.status) for r in detail.children] == [("a-7", "closed")]


# REQ-BEADS-002
def test_beads_002_detail_commands() -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    get_bead(fake, CWD, "a-5")
    assert fake.calls == [
        (["show", "--json", "--", "a-5"], CWD),
        (["dep", "list", "--direction", "up", "--json", "--", "a-5"], CWD),
    ]


# REQ-BEADS-002
def test_beads_002_description_may_be_absent() -> None:
    shown = bead("a-5")
    del shown["description"]
    assert get_bead(FakeBd(shown={"a-5": shown}), CWD, "a-5").description is None


# REQ-BEADS-002
def test_beads_002_unknown_bead() -> None:
    with pytest.raises(BeadNotFound):
        get_bead(FakeBd(), CWD, "nope-1")


# REQ-BEADS-005
@pytest.mark.parametrize("output", [[], {"error": "database is locked"}, [5], "text"])
def test_beads_005_detail_unexpected_output(output: Any) -> None:
    with pytest.raises(BeadsError):
        get_bead(FakeBd(output=output), CWD, "a-5")


# REQ-BEADS-003
@pytest.mark.parametrize(
    ("value", "ok"),
    [
        ("a-1", True),
        ("qwikfone-cr91.5", True),
        ("A_b.c-9", True),
        ("--help", False),
        ("-x", False),
        ("../x", False),
        ("a/b", False),
        ("a b", False),
        ("", False),
        (".a", False),
        ("a\x00b", False),
    ],
)
def test_beads_003_id_validation(value: str, ok: bool) -> None:
    assert valid_id(value) is ok


# REQ-BEADS-003
def test_beads_003_an_invalid_id_never_reaches_bd() -> None:
    fake = FakeBd()
    with pytest.raises(BeadNotFound):
        get_bead(fake, CWD, "--help")
    assert fake.calls == []


# REQ-BEADS-006
def test_beads_006_lone_surrogates_are_replaced() -> None:
    shown = bead(
        "a-5",
        title="a\ud800b",
        description="d\ud800",
        labels=["\ud800"],
        dependencies=[related("a-4", "blocks", title="t\ud800")],
    )
    detail = get_bead(FakeBd([shown], {"a-5": shown}), CWD, "a-5")
    for text in (
        detail.title,
        detail.description or "",
        detail.labels[0],
        detail.dependencies[0].title,
    ):
        text.encode("utf-8")
    assert detail.title == "a?b"


def fake_run(monkeypatch: pytest.MonkeyPatch, result: Any) -> list[Any]:
    calls: list[Any] = []

    def run(command: list[str], **kwargs: Any) -> Any:
        calls.append((command, kwargs))
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(subprocess, "run", run)
    return calls


def finished(out: str = "[]", code: int = 0, err: str = "") -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(["bd"], code, out, err)


# REQ-BEADS-005
def test_beads_005_real_runner_uses_a_30_second_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = fake_run(monkeypatch, finished('[{"id": "a-1"}]'))
    assert run_bd(["list", "--json"], CWD) == [{"id": "a-1"}]
    ((command, kwargs),) = calls
    assert command == ["bd", "list", "--json"]
    assert kwargs["timeout"] == 30 and kwargs["cwd"] == CWD


# REQ-BEADS-005
@pytest.mark.parametrize(
    ("failure", "message"),
    [
        (FileNotFoundError(), "bd not found"),
        (subprocess.TimeoutExpired("bd", 30), "bd timed out"),
        (PermissionError(13, "Permission denied"), "Permission denied"),
    ],
)
def test_beads_005_real_runner_failures(
    monkeypatch: pytest.MonkeyPatch, failure: Exception, message: str
) -> None:
    fake_run(monkeypatch, failure)
    with pytest.raises(BeadsError, match=message):
        run_bd(["list"], CWD)


# REQ-BEADS-005
def test_beads_005_real_runner_non_zero_exit_and_invalid_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_run(monkeypatch, finished("", code=2, err="boom"))
    with pytest.raises(BeadsError, match="exited 2: boom"):
        run_bd(["list"], CWD)
    fake_run(monkeypatch, finished("not json"))
    with pytest.raises(BeadsError, match="invalid JSON"):
        run_bd(["list"], CWD)


# REQ-BEADS-002
def test_beads_002_json_on_failure_lets_a_not_found_answer_through(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_run(monkeypatch, finished('{"error": "no issues found"}', code=1))
    assert run_bd(["show"], CWD, json_on_failure=True) == {"error": "no issues found"}


# REQ-BEADS-006
@pytest.mark.parametrize(
    ("answer", "error"),
    [
        ({"error": "x\ud800y"}, BeadsError),
        ({"error": "no issue \ud800 found"}, BeadNotFound),
    ],
)
def test_beads_006_error_messages_are_cleaned(
    answer: dict[str, str], error: type[Exception]
) -> None:
    with pytest.raises(error) as caught:
        get_bead(FakeBd(output=answer), CWD, "a-5")
    str(caught.value).encode("utf-8")


# REQ-BEADS-002
def test_beads_002_a_malformed_relation_row_is_dropped_not_fatal() -> None:
    shown = bead(
        "a-5",
        dependencies=[
            related("a-4", "blocks"),
            {"id": "a-3", "title": 3, "dependency_type": "blocks"},
            "x",
            {},
        ],
    )
    detail = get_bead(FakeBd(shown={"a-5": shown}), CWD, "a-5")
    assert [r.id for r in detail.dependencies] == ["a-4"]


# REQ-BEADS-002
def test_beads_002_an_unknown_id_at_dep_list_is_not_found() -> None:
    class Flaky(FakeBd):
        def __call__(self, args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any:
            if args[0] == "dep":
                return {"error": 'resolving a-5: no issue found matching "a-5"'}
            return super().__call__(args, cwd, json_on_failure=json_on_failure)

    with pytest.raises(BeadNotFound):
        get_bead(Flaky(shown={"a-5": bead("a-5")}), CWD, "a-5")


# REQ-BEADS-003
@pytest.mark.parametrize("value", ["a-1\n", "a-1 ", "\u0661", "a\u0661"])
def test_beads_003_trailing_newline_and_non_ascii_digits_are_not_ids(value: str) -> None:
    assert valid_id(value) is False


# REQ-BEADS-005
def test_beads_005_invalid_utf8_in_the_output_is_tolerated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    # a bead written with a stray byte must not turn into an uncaught UnicodeDecodeError
    binary = tmp_path / "bin" / "bd"
    binary.parent.mkdir()
    binary.write_text(
        f"#!{sys.executable}\nimport sys\n"
        'sys.stdout.buffer.write(b\'[{"id": "a-1", "title": "x\\xffy"}]\')\n'
    )
    binary.chmod(binary.stat().st_mode | stat.S_IEXEC)
    monkeypatch.setenv("PATH", f"{binary.parent}{os.pathsep}{os.environ['PATH']}")
    assert run_bd(["list"], tmp_path) == [{"id": "a-1", "title": "x\ufffdy"}]


READY = ["ready", "--limit", "0", "--json"]


# REQ-BEADS-007
def test_beads_007_flags_and_closed_at() -> None:
    fake = FakeBd(
        [
            bead("r-1"),
            bead("b-1"),
            bead("w-1", status="in_progress"),
            bead("s-1", status="blocked"),
            bead("c-1", status="closed", closed_at="2026-10-15T10:00:00Z"),
        ],
        ready=["r-1"],
        blocked=["b-1"],
    )
    by_id = {b.id: b for b in list_beads(fake, CWD, closed=True)}
    assert (by_id["r-1"].ready, by_id["r-1"].blocked) == (True, False)
    assert (by_id["b-1"].ready, by_id["b-1"].blocked) == (False, True)
    assert (by_id["w-1"].ready, by_id["w-1"].blocked) == (False, False)
    assert by_id["s-1"].blocked is True  # status blocked, even if bd blocked does not list it
    assert by_id["c-1"].closed_at == "2026-10-15T10:00:00Z"
    assert by_id["r-1"].closed_at is None


# REQ-BEADS-007
def test_beads_007_commands_and_unknown_ids() -> None:
    fake = FakeBd([bead("a-1")], ready=["a-1", "ghost"], blocked=["ghost"])
    assert [b.id for b in list_beads(fake, CWD, closed=False)] == ["a-1"]
    assert [call[0] for call in fake.calls] == [
        ["list", "--limit", "0", "--json"],
        READY,
        ["blocked", "--json"],
    ]


# REQ-BEADS-007
# REQ-BEADS-005
@pytest.mark.parametrize("command", ["ready", "blocked"])
@pytest.mark.parametrize("output", [{"x": 1}, "text", 5])
def test_beads_007_unexpected_readiness_output(command: str, output: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        list_beads(FakeBd([bead("a-1")], bad={command: output}), CWD, closed=False)


# REQ-BEADS-007
@pytest.mark.parametrize("command", ["ready", "blocked"])
def test_beads_007_a_failing_readiness_command_fails_the_list(command: str) -> None:
    fake = FakeBd([bead("a-1")], failing={command: BeadsError(f"bd {command} failed")})
    with pytest.raises(BeadsError, match=f"bd {command} failed"):
        list_beads(fake, CWD, closed=False)
