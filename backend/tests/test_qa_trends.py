"""Trends worked out from runs: window, pass rate, flaky cases, time to fix (REQ-QA-014 to 017)."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fake_gin_qa import run_record

from gin_console.qa.models import ExportRun, FixStats, RunExport
from gin_console.qa.trends import (
    build_trends,
    flaky,
    in_window,
    pass_rate,
    time_to_fix,
    window,
)

UTC_ZONE = ZoneInfo("UTC")
HCM = ZoneInfo("Asia/Ho_Chi_Minh")
NOW = datetime(2026, 11, 28, 5, 0, tzinfo=UTC)


def run(
    case: str = "TC-UI-001",
    result: str = "passed",
    at: str = "2026-11-26T10:00:00Z",
    **fields: str,
) -> ExportRun:
    return ExportRun.model_validate(run_record(case, result, at, **fields))


def day(n: int) -> date:
    return date(2026, 11, n)


# REQ-QA-014: the window is the local days ending today, and --since is the UTC date of its start
def test_qa_014_window_in_the_browsers_zone() -> None:
    win = window(7, HCM, NOW)
    assert win.days == [day(n) for n in range(22, 29)]
    assert win.start == datetime(2026, 11, 21, 17, 0, tzinfo=UTC)
    assert win.since == day(21)


# REQ-QA-014: the window of 30 days in UTC ends today
def test_qa_014_window_thirty_days_utc() -> None:
    win = window(30, UTC_ZONE, NOW)
    assert len(win.days) == 30
    assert (win.days[0], win.days[-1]) == (date(2026, 10, 30), day(28))
    assert win.since == date(2026, 10, 30)


# REQ-QA-014: today is the local day, not the UTC one
def test_qa_014_window_today_is_local() -> None:
    late = datetime(2026, 11, 28, 20, 0, tzinfo=UTC)  # 03:00 on the 29th in Ho Chi Minh
    assert window(7, HCM, late).days[-1] == day(29)
    assert window(7, UTC_ZONE, late).days[-1] == day(28)


# REQ-QA-014: time-zone edges of the window: a skipped midnight, a half-hour zone and +14
@pytest.mark.parametrize(
    ("zone", "now", "first", "last", "start", "end", "since"),
    [
        (  # DST began at 00:00 on 2018-11-04, so that midnight does not exist (03:00Z, UTC-3)
            "America/Sao_Paulo",
            datetime(2018, 11, 10, 12, 0, tzinfo=UTC),
            date(2018, 11, 4),
            date(2018, 11, 10),
            datetime(2018, 11, 4, 3, 0, tzinfo=UTC),
            datetime(2018, 11, 11, 2, 0, tzinfo=UTC),  # 00:00 on the 11th at UTC-2
            date(2018, 11, 4),
        ),
        (  # UTC+5:30: midnight is 18:30Z of the day before
            "Asia/Kolkata",
            NOW,
            day(22),
            day(28),
            datetime(2026, 11, 21, 18, 30, tzinfo=UTC),
            datetime(2026, 11, 28, 18, 30, tzinfo=UTC),
            day(21),
        ),
        (  # UTC+14: 12:00Z is already the 29th
            "Pacific/Kiritimati",
            datetime(2026, 11, 28, 12, 0, tzinfo=UTC),
            day(23),
            day(29),
            datetime(2026, 11, 22, 10, 0, tzinfo=UTC),
            datetime(2026, 11, 29, 10, 0, tzinfo=UTC),
            day(22),
        ),
    ],
)
def test_qa_014_window_zone_edges(
    zone: str,
    now: datetime,
    first: date,
    last: date,
    start: datetime,
    end: datetime,
    since: date,
) -> None:
    win = window(7, ZoneInfo(zone), now)
    assert (win.days[0], win.days[-1], len(win.days)) == (first, last, 7)
    assert (win.start, win.end, win.since) == (start, end, since)
    inside = ExportRun.model_validate(run_record(at=(end - timedelta(seconds=1)).isoformat()))
    at_end = ExportRun.model_validate(run_record(at=end.isoformat()))
    before = ExportRun.model_validate(run_record(at=(start - timedelta(seconds=1)).isoformat()))
    at_start = ExportRun.model_validate(run_record(at=start.isoformat()))
    assert in_window([before, at_start, inside, at_end], win, None) == [at_start, inside]


# REQ-QA-014: a run after the end of today (clock skew) is in no section
def test_qa_014_run_after_today_is_dropped() -> None:
    win = window(7, HCM, NOW)  # today is the 28th in Ho Chi Minh; it ends at 17:00Z
    export = RunExport(
        runs=[
            run("TC-UI-001", "failed", "2026-11-28T16:59:59Z"),
            run("TC-UI-001", "passed", "2026-11-28T17:00:00Z"),  # the 29th
            run("TC-UI-002", "failed", "2026-11-28T17:00:00Z"),
            run("TC-UI-003", "passed", "2026-11-29T01:00:00Z", capability="api"),
        ]
    )
    trends = build_trends(export, win, HCM, None)
    assert [r.name for r in trends.pass_rate] == ["ui"]
    assert sum(p.passed + p.failed for p in trends.pass_rate[0].points) == 1
    assert trends.flaky == []
    assert trends.time_to_fix.overall == FixStats(fixes=0, median_seconds=None)
    assert [s.case for s in trends.still_failing] == ["TC-UI-001"]
    assert [c.name for c in trends.time_to_fix.by_capability] == ["ui"]


# REQ-QA-014: a run at the window start counts, one second earlier does not
def test_qa_014_run_at_the_window_start() -> None:
    win = window(7, HCM, NOW)
    runs = [run(at="2026-11-21T16:59:59Z"), run(at="2026-11-21T17:00:00Z")]
    kept = in_window(runs, win, None)
    assert [r.at for r in kept] == [datetime(2026, 11, 21, 17, 0, tzinfo=UTC)]


# REQ-QA-014: blocked and not run never count; the capability filter keeps export order
def test_qa_014_in_window_results_and_capability() -> None:
    win = window(7, UTC_ZONE, NOW)
    runs = [
        run("TC-UI-001", "blocked"),
        run("TC-UI-002", "not run"),
        run("TC-API-001", "passed", capability="api"),
        run("TC-UI-003", "failed"),
        run("TC-UI-004", "passed"),
    ]
    assert [r.case for r in in_window(runs, win, None)] == [
        "TC-API-001",
        "TC-UI-003",
        "TC-UI-004",
    ]
    assert [r.case for r in in_window(runs, win, "ui")] == ["TC-UI-003", "TC-UI-004"]


# REQ-QA-015: rate and gap
def test_qa_015_rate_and_gap() -> None:
    win = window(7, UTC_ZONE, NOW)
    runs = [
        run(at="2026-11-26T08:00:00Z"),
        run(at="2026-11-26T09:00:00Z"),
        run(at="2026-11-26T10:00:00Z"),
        run(result="failed", at="2026-11-26T11:00:00Z"),
        run(result="blocked", at="2026-11-27T09:00:00Z"),
        run(at="2026-11-28T01:00:00Z"),
        run(at="2026-11-28T02:00:00Z"),
    ]
    rows = pass_rate(in_window(runs, win, None), win, UTC_ZONE)
    assert [row.name for row in rows] == ["ui"]
    points = {p.date: p for p in rows[0].points}
    assert [p.date for p in rows[0].points] == win.days
    assert (points[day(26)].passed, points[day(26)].failed, points[day(26)].rate) == (3, 1, 0.75)
    assert (points[day(27)].passed, points[day(27)].failed, points[day(27)].rate) == (0, 0, None)
    assert points[day(28)].rate == 1.0


# REQ-QA-015: three decimals, rows by name, only capabilities with a counted run
def test_qa_015_rounding_and_rows_sorted() -> None:
    win = window(7, UTC_ZONE, NOW)
    runs = [
        run(capability="ui"),
        run(capability="ui"),
        run(result="failed", capability="ui"),
        run(capability="api"),
        run(result="blocked", capability="beads"),
    ]
    rows = pass_rate(in_window(runs, win, None), win, UTC_ZONE)
    assert [row.name for row in rows] == ["api", "ui"]
    assert rows[1].points[-3].rate == 0.667


# REQ-QA-015: a run belongs to the day it fell on in the zone
def test_qa_015_days_are_local() -> None:
    win = window(7, HCM, NOW)
    runs = [run(at="2026-11-27T17:30:00Z")]  # 00:30 on the 28th in Ho Chi Minh
    rows = pass_rate(in_window(runs, win, None), win, HCM)
    points = {p.date: p.passed for p in rows[0].points}
    assert points[day(28)] == 1 and points[day(27)] == 0


# REQ-QA-016: flips under one hash
def test_qa_016_flips_under_one_hash() -> None:
    runs = [
        run("TC-UI-001", "passed", "2026-11-26T08:00:00Z"),
        run("TC-UI-001", "failed", "2026-11-26T09:00:00Z"),
        run("TC-UI-001", "passed", "2026-11-26T10:00:00Z"),
        run("TC-UI-002", "failed", "2026-11-26T08:00:00Z", hash8="aaaa2222"),
        run("TC-UI-002", "passed", "2026-11-26T09:00:00Z", hash8="bbbb2222"),
    ]
    found = flaky(runs)
    assert [(f.case, f.flips, f.last_result) for f in found] == [("TC-UI-001", 2, "passed")]
    assert found[0].capability == "ui"
    assert found[0].last_at == datetime(2026, 11, 26, 10, 0, tzinfo=UTC)


# REQ-QA-016: flips add up over hashes; sorted by flips, then case; capability of the last run
def test_qa_016_sum_and_order() -> None:
    runs = [
        run("TC-B", "passed", "2026-11-26T01:00:00Z", hash8="h1"),
        run("TC-B", "failed", "2026-11-26T02:00:00Z", hash8="h1"),
        run("TC-B", "failed", "2026-11-26T03:00:00Z", hash8="h2"),
        run("TC-B", "passed", "2026-11-26T04:00:00Z", hash8="h2", capability="api"),
        run("TC-A", "passed", "2026-11-26T01:00:00Z"),
        run("TC-A", "failed", "2026-11-26T02:00:00Z"),
        run("TC-C", "passed", "2026-11-26T01:00:00Z"),
        run("TC-C", "passed", "2026-11-26T02:00:00Z"),
    ]
    found = flaky(runs)
    assert [(f.case, f.flips) for f in found] == [("TC-B", 2), ("TC-A", 1)]
    assert found[0].capability == "api"


# REQ-QA-016: two runs with one `at` keep export order: failed then passed is one flip
def test_qa_016_same_at_keeps_export_order() -> None:
    same = "2026-11-26T10:00:00Z"
    found = flaky([run(result="failed", at=same), run(result="passed", at=same)])
    assert [(f.flips, f.last_result) for f in found] == [(1, "passed")]


# REQ-QA-017: median and open streak
def test_qa_017_median_and_open_streak() -> None:
    runs = [
        run("TC-UI-003", "failed", "2026-11-26T09:00:00Z"),
        run("TC-UI-003", "passed", "2026-11-26T09:30:00Z"),
        run("TC-UI-001", "failed", "2026-11-26T10:00:00Z"),
        run("TC-UI-001", "failed", "2026-11-26T11:00:00Z"),
        run(
            "TC-BEADS-001",
            "failed",
            "2026-11-26T12:00:00Z",
            capability="beads",
            bug="gin-console-3kd",
        ),
        run("TC-UI-001", "passed", "2026-11-26T13:00:00Z"),
    ]
    fix, still = time_to_fix(runs)
    assert fix.overall == FixStats(fixes=2, median_seconds=6300)
    assert [(s.case, s.capability, s.bug) for s in still] == [
        ("TC-BEADS-001", "beads", "gin-console-3kd")
    ]
    assert still[0].failing_since == datetime(2026, 11, 26, 12, 0, tzinfo=UTC)
    assert [(c.name, c.fixes) for c in fix.by_capability] == [("beads", 0), ("ui", 2)]
    assert fix.by_capability[0].median_seconds is None


# REQ-QA-017: an odd number of fixes gives the middle duration
def test_qa_017_odd_median() -> None:
    runs = []
    for case, minutes in (("TC-A", 10), ("TC-B", 30), ("TC-C", 20)):
        runs.append(run(case, "failed", "2026-11-26T09:00:00Z"))
        runs.append(run(case, "passed", f"2026-11-26T09:{minutes}:00Z"))
    assert time_to_fix(runs)[0].overall == FixStats(fixes=3, median_seconds=1200)


# REQ-QA-017: a pass under another hash closes the streak; a later failure opens a new one
def test_qa_017_streak_closes_whatever_the_hash() -> None:
    runs = [
        run(result="failed", at="2026-11-26T09:00:00Z", hash8="aaaa1111"),
        run(result="passed", at="2026-11-26T09:10:00Z", hash8="bbbb2222"),
        run(result="failed", at="2026-11-26T09:20:00Z", hash8="bbbb2222"),
    ]
    fix, still = time_to_fix(runs)
    assert fix.overall == FixStats(fixes=1, median_seconds=600)
    assert [s.failing_since for s in still] == [datetime(2026, 11, 26, 9, 20, tzinfo=UTC)]


# REQ-QA-017: bug is the last non-empty one of the streak; the streak's first run names the
# capability; still failing runs oldest first
def test_qa_017_bug_and_order_of_open_streaks() -> None:
    runs = [
        run("TC-B", "failed", "2026-11-26T10:00:00Z", capability="api", bug="bd-1"),
        run("TC-B", "failed", "2026-11-26T10:30:00Z", capability="ui", bug="bd-2"),
        run("TC-B", "failed", "2026-11-26T10:40:00Z", capability="ui"),
        run("TC-A", "failed", "2026-11-26T09:00:00Z"),
    ]
    _, still = time_to_fix(runs)
    assert [(s.case, s.capability, s.bug) for s in still] == [
        ("TC-A", "ui", None),
        ("TC-B", "api", "bd-2"),
    ]


# REQ-QA-017: a pass with no open streak is not a fix; same `at` keeps export order
def test_qa_017_pass_alone_and_same_at() -> None:
    same = "2026-11-26T10:00:00Z"
    fix, still = time_to_fix(
        [run(result="passed", at=same), run("TC-X", "failed", same), run("TC-X", "passed", same)]
    )
    assert fix.overall == FixStats(fixes=1, median_seconds=0) and still == []


# REQ-QA-014: the capability filter drops other capabilities from every section
def test_qa_014_capability_filter_in_every_section() -> None:
    export = RunExport(
        runs=[
            run("TC-UI-001", "failed", "2026-11-26T09:00:00Z"),
            run("TC-UI-001", "passed", "2026-11-26T10:00:00Z"),
            run("TC-API-001", "failed", "2026-11-26T09:00:00Z", capability="api"),
            run("TC-API-001", "passed", "2026-11-26T10:00:00Z", capability="api"),
        ],
        problems=["bad line"],
    )
    win = window(7, UTC_ZONE, NOW)
    trends = build_trends(export, win, UTC_ZONE, "ui")
    assert trends.tz == "UTC" and trends.days == win.days and trends.problems == ["bad line"]
    assert [r.name for r in trends.pass_rate] == ["ui"]
    assert [f.case for f in trends.flaky] == ["TC-UI-001"]
    assert [c.name for c in trends.time_to_fix.by_capability] == ["ui"]
    assert trends.time_to_fix.overall.fixes == 1
    both = build_trends(export, win, UTC_ZONE, None)
    assert [r.name for r in both.pass_rate] == ["api", "ui"] and both.time_to_fix.overall.fixes == 2


# REQ-QA-014: no runs give empty sections
def test_qa_014_empty_runs() -> None:
    trends = build_trends(RunExport(runs=[]), window(7, UTC_ZONE, NOW), UTC_ZONE, None)
    assert trends.pass_rate == [] and trends.flaky == [] and trends.still_failing == []
    assert trends.time_to_fix.overall == FixStats(fixes=0, median_seconds=None)
    assert trends.time_to_fix.by_capability == []
