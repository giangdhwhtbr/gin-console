from datetime import date, datetime

import pytest

from gin_console.reports.history import milestone_on, parse_moves, parse_points, points_on
from gin_console.reports.models import ReportBead


def epic(
    created: str = "2026-11-01T10:00:00Z",
    parent: str | None = None,
    points: int | None = None,
    moves: object = None,
    history: object = None,
) -> ReportBead:
    return ReportBead(
        project="alpha",
        id="e-1",
        title="e",
        issue_type="epic",
        status="open",
        parent=parent,
        points=points,
        created_at=datetime.fromisoformat(created),
        updated_at=datetime.fromisoformat(created),
        moves=parse_moves(moves),
        points_history=parse_points(history),
    )


def nov(day: int) -> date:
    return date(2026, 11, day)


# REQ-REPORTS-021
def test_reports_021_moved_in_after_kickoff() -> None:
    bead = epic(
        created="2026-11-02T10:00:00Z",
        parent="m2",
        moves=[{"from": None, "to": "m2", "at": "2026-11-18T09:00:00Z"}],
    )
    assert milestone_on(bead, nov(17)) is None
    assert milestone_on(bead, nov(18)) == "m2"


# REQ-REPORTS-021
def test_reports_021_moved_out() -> None:
    bead = epic(parent="m3", moves=[{"from": "m2", "to": "m3", "at": "2026-11-20T10:00:00Z"}])
    assert milestone_on(bead, nov(19)) == "m2"
    assert milestone_on(bead, nov(20)) == "m3"


# REQ-REPORTS-021
def test_reports_021_re_estimated() -> None:
    bead = epic(
        history=[
            {"from": None, "to": 5, "at": "2026-11-10T08:00:00Z"},
            {"from": 5, "to": 8, "at": "2026-11-16T08:00:00Z"},
        ]
    )
    assert [points_on(bead, nov(d)) for d in (9, 12, 16)] == [None, 5, 8]


# REQ-REPORTS-021
def test_reports_021_no_history() -> None:
    bead = epic(created="2026-11-03T10:00:00Z", parent="m2", points=3)
    assert (milestone_on(bead, nov(4)), points_on(bead, nov(4))) == ("m2", 3)
    assert (milestone_on(bead, nov(2)), points_on(bead, nov(2))) == (None, None)


# REQ-REPORTS-021
def test_reports_021_broken_history() -> None:
    bead = epic(parent="m2", points=5, moves=[{"from": None, "to": "m2"}], history="oops")
    assert bead.moves == [] and bead.points_history == []
    assert (milestone_on(bead, nov(2)), points_on(bead, nov(2))) == ("m2", 5)


# REQ-REPORTS-021
def test_reports_021_parse_json_text_and_list_agree() -> None:
    entries = '[{"from": null, "to": "m2", "at": "2026-11-18T09:00:00Z", "actor": "x"}]'
    [text] = parse_moves(entries)
    [plain] = parse_moves([{"from": None, "to": "m2", "at": "2026-11-18T09:00:00+00:00"}])
    assert text == plain
    assert text.day == datetime.fromisoformat("2026-11-18T09:00:00Z").astimezone().date()
    assert (text.source, text.target) == (None, "m2")


# REQ-REPORTS-021
@pytest.mark.parametrize(
    "raw",
    [
        "oops",
        None,
        3,
        {"at": "2026-11-18T09:00:00Z"},
        "[1, 2]",
        [{"to": "m2"}],
        [{"at": 5}],
        [{"at": "yesterday", "to": "m2"}],
        [{"at": "2026-11-18T09:00:00Z", "to": 4}],
    ],
)
def test_reports_021_parse_moves_drops_what_is_not_an_entry(raw: object) -> None:
    assert parse_moves(raw) == []


# REQ-REPORTS-021
def test_reports_021_points_off_scale_are_none_and_wrong_type_drops_the_entry() -> None:
    changes = parse_points(
        [
            {"from": 5, "to": 4, "at": "2026-11-16T08:00:00Z"},
            {"from": None, "to": "8", "at": "2026-11-17T08:00:00Z"},
            {"from": None, "to": True, "at": "2026-11-17T08:00:00Z"},
        ]
    )
    assert [(c.before, c.after) for c in changes] == [(5, None)]


# REQ-REPORTS-021
def test_reports_021_entries_are_sorted_by_at() -> None:
    moves = parse_moves(
        [
            {"from": "m2", "to": "m3", "at": "2026-11-20T10:00:00Z"},
            {"from": None, "to": "m2", "at": "2026-11-05T10:00:00Z"},
        ]
    )
    assert [m.target for m in moves] == ["m2", "m3"]
