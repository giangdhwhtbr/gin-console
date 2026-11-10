import os
import stat
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from fake_bd import FakeBd, bead, comment, dep

from gin_console.beads.snapshot import Snapshot, build_snapshot
from gin_console.beads.source import (
    MAX_COMMENT_CHARS,
    BeadNotFound,
    BeadsError,
    count_reopens,
    export_beads,
    get_bead,
    get_comments,
    list_beads,
    run_bd,
    valid_id,
)

CWD = Path("/tmp/project")


def snap(*rows: Any) -> Snapshot:
    return build_snapshot(list(rows))


# REQ-BEADS-001
def test_beads_001_closed_flag() -> None:
    snapshot = snap(bead("a-1"), bead("a-2", status="closed"))
    assert [b.id for b in list_beads(snapshot, closed=False)] == ["a-1"]
    assert [b.id for b in list_beads(snapshot, closed=True)] == ["a-1", "a-2"]


# REQ-BEADS-001
def test_beads_001_one_export_command() -> None:
    fake = FakeBd([bead("a-1")])
    assert [row["id"] for row in export_beads(fake, CWD)] == ["a-1"]
    assert fake.calls == [(["export"], CWD)]


# REQ-BEADS-001
def test_beads_001_optional_fields_default() -> None:
    (summary,) = list_beads(snap(bead("a-1")), closed=False)
    assert (summary.labels, summary.assignee, summary.parent) == ([], None, None)
    assert summary.priority == 2 and summary.comment_count == 0


# REQ-BEADS-001
def test_beads_001_parent_comes_from_the_parent_child_row() -> None:
    child = bead("e-1.1", dependencies=[dep("e-1.1", "e-1", "parent-child")])
    by_id = {b.id: b for b in list_beads(snap(bead("e-1", issue_type="epic"), child), False)}
    assert (by_id["e-1"].parent, by_id["e-1.1"].parent) == (None, "e-1")


# REQ-BEADS-005
def test_beads_005_a_malformed_bead_is_left_out_of_the_list() -> None:
    snapshot = snap(
        bead("a-1"),
        bead("a-2", title=7),
        bead("a-3", priority="high"),
        bead("a-4", priority=True),
        "x",
        {"id": 5},
    )
    assert [b.id for b in list_beads(snapshot, closed=False)] == ["a-1"]


# REQ-BEADS-005
@pytest.mark.parametrize("output", [{"x": 1}, "text", 5])
def test_beads_005_unexpected_export_output(output: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        build_snapshot(output)


# REQ-BEADS-002
def test_beads_002_detail_relations() -> None:
    shown = bead(
        "a-5",
        description="Why and what",
        dependencies=[
            dep("a-5", "a-4", "blocks"),
            dep("a-5", "a-1", "parent-child"),
            dep("a-5", "z", "relates_to"),
            dep("a-5", "external:other:cap", "blocks"),
        ],
    )
    snapshot = snap(
        bead("a-1"),
        bead("a-4"),
        bead("z"),
        shown,
        bead("a-6", dependencies=[dep("a-6", "a-5", "blocks")]),
        bead("a-7", status="closed", dependencies=[dep("a-7", "a-5", "parent-child")]),
    )
    detail = get_bead(snapshot, "a-5")
    assert detail.description == "Why and what" and detail.parent == "a-1"
    assert [(r.id, r.type) for r in detail.dependencies] == [
        ("a-4", "blocks"),
        ("a-1", "parent-child"),
    ]
    assert [r.id for r in detail.dependents] == ["a-6"]
    assert [(r.id, r.status) for r in detail.children] == [("a-7", "closed")]


# REQ-BEADS-002
def test_beads_002_detail_flags_match_the_list() -> None:
    snapshot = snap(bead("a-1"), bead("a-5", dependencies=[dep("a-5", "a-1", "blocks")]))
    detail = get_bead(snapshot, "a-5")
    assert (detail.blocked, detail.ready, detail.blocked_by) == (True, False, ["a-1"])


# REQ-BEADS-002
def test_beads_002_description_may_be_absent() -> None:
    shown = bead("a-5")
    del shown["description"]
    assert get_bead(snap(shown), "a-5").description is None


# REQ-BEADS-002
def test_beads_002_unknown_bead() -> None:
    with pytest.raises(BeadNotFound):
        get_bead(snap(bead("a-1")), "nope-1")


# REQ-BEADS-005
def test_beads_005_detail_unexpected_row() -> None:
    with pytest.raises(BeadsError, match="not understood"):
        get_bead(snap(bead("a-5", title=7)), "a-5")


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
@pytest.mark.parametrize("value", ["a-1\n", "a-1 ", "١", "a١"])
def test_beads_003_trailing_newline_and_non_ascii_digits_are_not_ids(value: str) -> None:
    assert valid_id(value) is False


# REQ-BEADS-003
def test_beads_003_an_invalid_id_is_not_found() -> None:
    snapshot = snap({**bead("a-1"), "id": "--help"})
    with pytest.raises(BeadNotFound):
        get_bead(snapshot, "--help")
    with pytest.raises(BeadNotFound):
        get_comments(snapshot, "--help")


# REQ-BEADS-006
def test_beads_006_lone_surrogates_are_replaced() -> None:
    shown = bead(
        "a-5",
        title="a\ud800b",
        description="d\ud800",
        labels=["\ud800"],
        dependencies=[dep("a-5", "a-4", "blocks")],
    )
    detail = get_bead(snap(bead("a-4", title="t\ud800"), shown), "a-5")
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
def test_beads_005_real_runner_reads_export_lines_with_a_30_second_timeout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = fake_run(monkeypatch, finished('{"id": "a-1"}\n\n{"id": "a-2"}\n'))
    assert run_bd(["export"], CWD) == [{"id": "a-1"}, {"id": "a-2"}]
    ((command, kwargs),) = calls
    assert command == ["bd", "export"]
    assert kwargs["timeout"] == 30 and kwargs["cwd"] == CWD


# REQ-BEADS-005
@pytest.mark.parametrize("out", ['{"id": "a-1"}\nnot json\n', '[{"id": "a-1"}]\n', "5\n"])
def test_beads_005_real_runner_rejects_odd_export_lines(
    monkeypatch: pytest.MonkeyPatch, out: str
) -> None:
    fake_run(monkeypatch, finished(out))
    with pytest.raises(BeadsError):
        run_bd(["export"], CWD)


# REQ-BEADS-005
def test_beads_005_real_runner_reads_json_for_other_commands(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_run(monkeypatch, finished('[{"Issue": {"status": "open"}}]'))
    assert run_bd(["history", "--json", "--", "a-1"], CWD) == [{"Issue": {"status": "open"}}]


# REQ-BEADS-005
@pytest.mark.parametrize(
    ("failure", "message"),
    [
        (FileNotFoundError(), "bd not found"),
        (subprocess.TimeoutExpired("bd", 30), "bd timed out"),
        (PermissionError(13, "Permission denied"), "Permission denied"),
    ],
)
@pytest.mark.parametrize("command", ["export", "history"])
def test_beads_005_real_runner_failures(
    monkeypatch: pytest.MonkeyPatch, failure: Exception, message: str, command: str
) -> None:
    fake_run(monkeypatch, failure)
    with pytest.raises(BeadsError, match=message):
        run_bd([command], CWD)


# REQ-BEADS-005
def test_beads_005_real_runner_non_zero_exit_and_invalid_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_run(monkeypatch, finished("", code=2, err="boom"))
    with pytest.raises(BeadsError, match="exited 2: boom"):
        run_bd(["export"], CWD)
    fake_run(monkeypatch, finished("not json"))
    with pytest.raises(BeadsError, match="invalid JSON"):
        run_bd(["history"], CWD)


# REQ-BEADS-011
def test_beads_011_json_on_failure_lets_a_not_found_answer_through(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_run(monkeypatch, finished('{"error": "no issues found"}', code=1))
    assert run_bd(["history"], CWD, json_on_failure=True) == {"error": "no issues found"}


# REQ-BEADS-005
def test_beads_005_invalid_utf8_in_the_output_is_tolerated(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    # a bead written with a stray byte must not turn into an uncaught UnicodeDecodeError
    binary = tmp_path / "bin" / "bd"
    binary.parent.mkdir()
    binary.write_text(
        f"#!{sys.executable}\nimport sys\n"
        'sys.stdout.buffer.write(b\'{"id": "a-1", "title": "x\\xffy"}\\n\')\n'
    )
    binary.chmod(binary.stat().st_mode | stat.S_IEXEC)
    monkeypatch.setenv("PATH", f"{binary.parent}{os.pathsep}{os.environ['PATH']}")
    assert run_bd(["export"], tmp_path) == [{"id": "a-1", "title": "x�y"}]


# REQ-BEADS-002
def test_beads_002_a_malformed_relation_row_is_dropped_not_fatal() -> None:
    shown = bead(
        "a-5",
        dependencies=[
            dep("a-5", "a-4", "blocks"),
            dep("a-5", "a-3", "blocks"),
            {"issue_id": "a-5", "depends_on_id": 7, "type": "blocks"},
            "x",
            {},
        ],
    )
    snapshot = snap(bead("a-4"), bead("a-3", title=3), shown)
    assert [r.id for r in get_bead(snapshot, "a-5").dependencies] == ["a-4"]


# REQ-BEADS-007
def test_beads_007_flags_and_closed_at() -> None:
    snapshot = snap(
        bead("r-1"),
        bead("w-1", status="in_progress"),
        bead("b-1", dependencies=[dep("b-1", "w-1", "blocks")]),
        bead("s-1", status="blocked"),
        bead("c-1", status="closed", closed_at="2026-10-15T10:00:00Z"),
    )
    by_id = {b.id: b for b in list_beads(snapshot, closed=True)}
    assert (by_id["r-1"].ready, by_id["r-1"].blocked) == (True, False)
    assert (by_id["b-1"].ready, by_id["b-1"].blocked) == (False, True)
    assert (by_id["w-1"].ready, by_id["w-1"].blocked) == (False, False)
    assert by_id["s-1"].blocked is True  # status blocked, even if no blocker is open
    assert by_id["c-1"].closed_at == "2026-10-15T10:00:00Z"
    assert by_id["r-1"].closed_at is None


# REQ-BEADS-007
# REQ-MILESTONE-UI-007
def test_beads_007_milestone_is_never_ready() -> None:
    snapshot = snap(bead("m-1", issue_type="milestone"), bead("r-1"))
    by_id = {b.id: b for b in list_beads(snapshot, closed=False)}
    assert (by_id["m-1"].ready, by_id["r-1"].ready) == (False, True)


# REQ-BEADS-008
def test_beads_008_comments_in_order() -> None:
    first = comment("a-5", "first", created_at="2026-10-11T10:00:00Z")
    second = comment("a-5", "second text", created_at="2026-10-12T10:00:00Z")
    comments = get_comments(snap(bead("a-5", comments=[first, second])), "a-5")
    assert [c.text for c in comments] == ["first", "second text"]
    assert comments[0].author == "me" and comments[0].created_at == "2026-10-11T10:00:00Z"
    assert not comments[0].truncated


# REQ-BEADS-008
def test_beads_008_long_comment_is_cut_and_marked() -> None:
    long = comment("a-5", "x" * 25_000)
    exact = comment("a-5", "y" * MAX_COMMENT_CHARS)
    cut, whole = get_comments(snap(bead("a-5", comments=[long, exact])), "a-5")
    assert len(cut.text) == MAX_COMMENT_CHARS and cut.truncated
    assert len(whole.text) == MAX_COMMENT_CHARS and not whole.truncated


# REQ-BEADS-008
@pytest.mark.parametrize("comments", [None, [], {"x": 1}, "text"])
def test_beads_008_no_or_odd_comments_is_an_empty_list(comments: Any) -> None:
    extra = {} if comments is None else {"comments": comments}
    assert get_comments(snap(bead("a-5", **extra)), "a-5") == []


# REQ-BEADS-008
def test_beads_008_a_malformed_comment_is_dropped() -> None:
    items = [comment("a-5", "ok"), comment("a-5") | {"text": 7}, "x", {"id": "z"}]
    assert [c.text for c in get_comments(snap(bead("a-5", comments=items)), "a-5")] == ["ok"]


# REQ-BEADS-008
def test_beads_008_unknown_bead_is_not_found() -> None:
    with pytest.raises(BeadNotFound):
        get_comments(snap(bead("a-5")), "x-1")


# REQ-BEADS-008
# REQ-BEADS-006
def test_beads_008_lone_surrogates_are_replaced() -> None:
    items = [comment("a-5", "bad \ud800 text", author="a\udc00b")]
    (item,) = get_comments(snap(bead("a-5", comments=items)), "a-5")
    item.text.encode("utf-8")
    item.author.encode("utf-8")


# REQ-BEADS-009
def test_beads_009_author_and_text_fields() -> None:
    shown = bead(
        "a-5",
        created_by="gin",
        design="the design",
        notes="some notes",
        acceptance_criteria="it works",
        close_reason="done",
    )
    detail = get_bead(snap(shown), "a-5")
    assert detail.created_by == "gin"
    assert (detail.design, detail.notes) == ("the design", "some notes")
    assert (detail.acceptance_criteria, detail.close_reason) == ("it works", "done")


# REQ-BEADS-009
def test_beads_009_absent_or_empty_texts_are_null() -> None:
    detail = get_bead(snap(bead("a-5", design="", created_by=None)), "a-5")
    assert detail.design is None and detail.notes is None
    assert detail.acceptance_criteria is None and detail.close_reason is None
    assert detail.created_by is None


# REQ-BEADS-009
def test_beads_009_list_rows_carry_created_by() -> None:
    (row,) = list_beads(snap(bead("a-1", created_by="gin")), closed=False)
    assert row.created_by == "gin"


# REQ-BEADS-010
def test_beads_010_blocks_and_blocked_by_rows() -> None:
    row = bead("a-5", dependencies=[dep("a-5", "a-1", "blocks"), dep("a-5", "a-2", "blocked-by")])
    (summary,) = list_beads(snap(row), closed=False)
    assert summary.blocked_by == ["a-1", "a-2"]


# REQ-BEADS-010
def test_beads_010_other_types_are_ignored() -> None:
    row = bead(
        "a-5",
        dependencies=[
            dep("a-5", "e-1", "parent-child"),
            dep("a-5", "a-1", "related"),
            dep("a-5", "a-2", "discovered-from"),
            dep("a-5", "a-3", "supersedes"),
        ],
    )
    (summary,) = list_beads(snap(row), closed=False)
    assert summary.blocked_by == []


# REQ-BEADS-010
def test_beads_010_a_malformed_row_is_skipped_not_the_bead() -> None:
    row = bead(
        "a-5",
        dependencies=[
            {"issue_id": "a-5", "depends_on_id": 7, "type": "blocks"},
            "x",
            {"issue_id": "a-5", "type": "blocks"},
            dep("a-5", "a-1", "blocks"),
            dep("a-5", "a-1", "blocks"),
        ],
    )
    (summary,) = list_beads(snap(row), closed=False)
    assert summary.id == "a-5" and summary.blocked_by == ["a-1"]  # the duplicate is dropped too


# REQ-BEADS-010
@pytest.mark.parametrize("dependencies", [None, [], "text", {"x": 1}])
def test_beads_010_no_or_odd_dependencies_give_an_empty_list(dependencies: Any) -> None:
    extra = {} if dependencies is None else {"dependencies": dependencies}
    (summary,) = list_beads(snap(bead("a-5", **extra)), closed=False)
    assert summary.blocked_by == []


# REQ-BEADS-002
def test_beads_002_bugs_found() -> None:
    def found(ident: str, kind: str, **extra: Any) -> dict[str, Any]:
        return bead(ident, dependencies=[dep(ident, "a-5", kind)], **extra)

    snapshot = snap(
        bead("a-0"),
        bead("a-5", dependencies=[dep("a-5", "a-0", "discovered-from")]),
        found("b-1", "discovered-from", issue_type="bug"),
        found("b-2", "discovered-from", issue_type="bug", status="closed"),
        found("e-1", "discovered-from", issue_type="epic"),
        found("a-6", "blocks"),
    )
    detail = get_bead(snapshot, "a-5")
    assert [(r.id, r.status, r.type) for r in detail.bugs] == [
        ("b-1", "open", "discovered-from"),
        ("b-2", "closed", "discovered-from"),
    ]
    assert [r.id for r in detail.dependents] == ["a-6"]
    assert detail.children == [] and detail.dependencies == []


# REQ-BEADS-011
@pytest.mark.parametrize(
    ("statuses", "expected"),
    [
        (["open", "in_progress", "closed", "closed", "open", "closed", "in_progress", "closed"], 2),
        (["open", "in_progress", "closed", "closed"], 0),
        (["open"], 0),
    ],
)
def test_beads_011_counts_closed_then_not_closed(statuses: list[str], expected: int) -> None:
    fake = FakeBd(history={"a-5": statuses})
    assert count_reopens(fake, CWD, "a-5") == expected
    assert fake.calls == [(["history", "--json", "--", "a-5"], CWD)]


# REQ-BEADS-011
def test_beads_011_unknown_bead() -> None:
    with pytest.raises(BeadNotFound):
        count_reopens(FakeBd(), CWD, "x-1")


# REQ-BEADS-011
@pytest.mark.parametrize(
    ("answer", "error"),
    [
        ({"error": "x\ud800y"}, BeadsError),
        ({"error": "no issue \ud800 found"}, BeadNotFound),
    ],
)
def test_beads_011_error_messages_are_cleaned(
    answer: dict[str, str], error: type[Exception]
) -> None:
    with pytest.raises(error) as caught:
        count_reopens(FakeBd(output=answer), CWD, "a-5")
    str(caught.value).encode("utf-8")


# REQ-BEADS-011
@pytest.mark.parametrize("output", [{"x": 1}, [{"Issue": {}}], [{"Issue": {"status": 3}}], ["x"]])
def test_beads_011_unexpected_shape(output: object) -> None:
    with pytest.raises(BeadsError):
        count_reopens(FakeBd(bad={"history": output}), CWD, "a-5")
