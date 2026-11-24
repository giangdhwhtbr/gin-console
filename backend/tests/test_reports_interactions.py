import json
import os
from datetime import date, datetime
from pathlib import Path

from gin_console.reports.interactions import LOG, InteractionStore, read_reopens


def _line(ident: str, old: str, new: object, **over: object) -> dict[str, object]:
    return {
        "created_at": "2026-11-18T09:00:00Z",
        "id": "int-1",
        "kind": "field_change",
        "issue_id": ident,
        "extra": {"field": "status", "old_value": old, "new_value": new},
        **over,
    }


DAY = datetime.fromisoformat("2026-11-18T09:00:00Z").astimezone().date()


def _write(project: Path, lines: list[object]) -> Path:
    path = project / LOG
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join((x if isinstance(x, str) else json.dumps(x)) + "\n" for x in lines))
    return path


# REQ-REPORTS-019
def test_reports_019_reopens_counted(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        [
            _line("a-1", "in_progress", "closed"),
            _line("a-1", "closed", "open"),
            _line("a-1", "open", "closed"),
            _line("a-1", "closed", "in_progress"),
        ],
    )
    assert read_reopens(path) == {"a-1": [DAY, DAY]}
    assert InteractionStore().reopens(tmp_path) == {"a-1": [DAY, DAY]}


# REQ-REPORTS-019
def test_reports_019_missing_log_counts_nothing(tmp_path: Path) -> None:
    assert read_reopens(tmp_path / LOG) == {}
    assert InteractionStore().reopens(tmp_path) == {}


# REQ-REPORTS-019
def test_reports_019_broken_lines_count_nothing(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        [
            "not json",
            "[1, 2]",
            {"kind": "field_change", "issue_id": "b-1"},
            _line("b-1", "closed", "closed"),
            _line("b-1", "closed", 3),
            _line("b-1", "closed", "open", kind="comment"),
            {**_line("b-1", "closed", "open"), "issue_id": 4},
            _line("b-1", "closed", "open"),
        ],
    )
    assert read_reopens(path) == {"b-1": [DAY]}


# REQ-REPORTS-019
def test_reports_019_read_again_only_on_change(tmp_path: Path) -> None:
    path = _write(tmp_path, [_line("a-1", "closed", "open")])
    calls: list[Path] = []

    def read(p: Path) -> dict[str, list[date]]:
        calls.append(p)
        return read_reopens(p)

    store = InteractionStore(read)
    assert store.reopens(tmp_path) == {"a-1": [DAY]}
    assert store.reopens(tmp_path) == {"a-1": [DAY]}
    assert len(calls) == 1

    with path.open("a") as out:
        out.write(json.dumps(_line("a-1", "closed", "open")) + "\n")
    t = path.stat().st_mtime_ns + 1000
    os.utime(path, ns=(t, t + 1))
    assert store.reopens(tmp_path) == {"a-1": [DAY, DAY]}
    assert len(calls) == 2


# REQ-REPORTS-019
def test_reports_019_unreadable_log_counts_nothing(tmp_path: Path) -> None:
    (tmp_path / LOG).mkdir(parents=True)  # a directory where the file should be
    assert read_reopens(tmp_path / LOG) == {}
    assert InteractionStore().reopens(tmp_path) == {}


# REQ-REPORTS-021
def test_reports_021_reopen_without_created_at_counts_on_the_minimum_date(tmp_path: Path) -> None:
    gone = {k: v for k, v in _line("a-1", "closed", "open").items() if k != "created_at"}
    path = _write(
        tmp_path,
        [gone, _line("a-1", "closed", "open", created_at="oops"), _line("a-1", "closed", "open")],
    )
    assert read_reopens(path) == {"a-1": [date.min, date.min, DAY]}
