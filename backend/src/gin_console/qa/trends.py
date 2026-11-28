"""The trends of a project's runs: pass rate, flaky cases, time to fix (REQ-QA-014 to 017).

Pure functions over runs in export order (`at`, then file and line), which also orders runs that
share an `at`; nothing here reads a file or runs a command."""

import statistics
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from gin_console.qa.models import (
    CapabilityFix,
    ExportRun,
    FixStats,
    FlakyCase,
    PassRatePoint,
    PassRateRow,
    RunExport,
    StillFailing,
    TimeToFix,
    Trends,
)

WINDOWS = (7, 30, 90)
COUNTED = ("passed", "failed")


@dataclass(frozen=True)
class Window:
    days: list[date]  # local dates, oldest first; the last is today in the zone
    start: datetime  # 00:00 of days[0] in the zone, in UTC
    end: datetime  # 00:00 after days[-1] in the zone, in UTC; a run at `end` is outside
    since: date  # the UTC date of `start`, the `--since` value


def window(days: int, tz: ZoneInfo, now: datetime) -> Window:
    today = now.astimezone(tz).date()
    dates = [today - timedelta(days=n) for n in range(days - 1, -1, -1)]
    # in UTC: a local midnight that a clock change skips is not equal to its instant otherwise
    start = datetime.combine(dates[0], time.min, tzinfo=tz).astimezone(UTC)
    end = datetime.combine(today + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)
    return Window(dates, start, end, start.date())


def in_window(runs: Sequence[ExportRun], win: Window, capability: str | None) -> list[ExportRun]:
    """The passed and failed runs inside the window, of one capability when given."""
    return [
        run
        for run in runs
        if win.start <= run.at < win.end
        and run.result in COUNTED
        and (capability is None or run.capability == capability)
    ]


def pass_rate(runs: Sequence[ExportRun], win: Window, tz: ZoneInfo) -> list[PassRateRow]:
    """REQ-QA-015: per capability, one point per day with passed, failed and the rate."""
    counts: dict[str, dict[date, list[int]]] = defaultdict(lambda: defaultdict(lambda: [0, 0]))
    for run in runs:
        counts[run.capability][run.at.astimezone(tz).date()][run.result == "failed"] += 1
    rows: list[PassRateRow] = []
    for name in sorted(counts):
        points: list[PassRatePoint] = []
        for each in win.days:
            passed, failed = counts[name][each] if each in counts[name] else (0, 0)
            total = passed + failed
            rate = round(passed / total, 3) if total else None
            points.append(PassRatePoint(date=each, passed=passed, failed=failed, rate=rate))
        rows.append(PassRateRow(name=name, points=points))
    return rows


def flaky(runs: Sequence[ExportRun]) -> list[FlakyCase]:
    """REQ-QA-016: cases whose result changes between consecutive runs of one `hash8`."""
    by_case: dict[str, list[ExportRun]] = defaultdict(list)
    for run in runs:
        by_case[run.case].append(run)
    found: list[FlakyCase] = []
    for case, own in by_case.items():
        last_of_hash: dict[str, str] = {}
        flips = 0
        for run in own:
            before = last_of_hash.get(run.hash8)
            if before is not None and before != run.result:
                flips += 1
            last_of_hash[run.hash8] = run.result
        if flips:
            last = own[-1]
            found.append(
                FlakyCase(
                    case=case,
                    capability=last.capability,
                    flips=flips,
                    last_result=last.result,
                    last_at=last.at,
                )
            )
    return sorted(found, key=lambda f: (-f.flips, f.case))


def _stats(durations: Sequence[float]) -> FixStats:
    median = float(statistics.median(durations)) if durations else None
    return FixStats(fixes=len(durations), median_seconds=median)


def time_to_fix(runs: Sequence[ExportRun]) -> tuple[TimeToFix, list[StillFailing]]:
    """REQ-QA-017: a streak opens at a failed run of a case with none open and closes at its next
    passed run, whatever the `hash8`."""
    open_streaks: dict[str, tuple[ExportRun, str]] = {}  # case -> first failed run, last bug
    overall: list[float] = []
    by_capability: dict[str, list[float]] = {}
    for run in runs:
        streak = open_streaks.get(run.case)
        if run.result == "failed":
            if streak is None:
                by_capability.setdefault(run.capability, [])
                open_streaks[run.case] = (run, run.bug)
            else:
                open_streaks[run.case] = (streak[0], run.bug or streak[1])
        elif streak is not None:
            seconds = (run.at - streak[0].at).total_seconds()
            overall.append(seconds)
            by_capability[streak[0].capability].append(seconds)
            del open_streaks[run.case]
    still = [
        StillFailing(
            case=case,
            capability=first.capability,
            failing_since=first.at,
            bug=bug or None,
        )
        for case, (first, bug) in open_streaks.items()
    ]
    still.sort(key=lambda s: (s.failing_since, s.case))
    fixes = TimeToFix(
        overall=_stats(overall),
        by_capability=[
            CapabilityFix(name=name, **_stats(by_capability[name]).model_dump())
            for name in sorted(by_capability)
        ],
    )
    return fixes, still


def build_trends(export: RunExport, win: Window, tz: ZoneInfo, capability: str | None) -> Trends:
    runs = in_window(export.runs, win, capability)
    fixes, still = time_to_fix(runs)
    return Trends(
        days=win.days,
        tz=tz.key,
        pass_rate=pass_rate(runs, win, tz),
        flaky=flaky(runs),
        time_to_fix=fixes,
        still_failing=still,
        problems=export.problems,
    )
