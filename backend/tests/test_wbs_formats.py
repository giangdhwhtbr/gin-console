import csv
import io
from datetime import UTC, date, datetime
from typing import Any

import pytest
from openpyxl import load_workbook

from gin_console.milestones.wbs import WbsDocument, WbsRow
from gin_console.milestones.wbs_formats import to_csv, to_markdown, to_xlsx

NOW = datetime(2026, 11, 24, 9, 5, tzinfo=UTC)


def row(ident: str, wbs: str, **extra: Any) -> WbsRow:
    fields: dict[str, Any] = {
        "wbs": wbs,
        "level": wbs.count(".") + 1,
        "id": ident,
        "parent_id": None,
        "milestone_title": None,
        "name": ident,
        "issue_type": "task",
        "type_label": "Task",
        "status": "Open",
        "blocked": False,
        "assignee": "Unassigned",
        "assignee_email": None,
        "points": None,
        "estimate_days": None,
        "estimate_assumed": False,
        "planned_start": None,
        "planned_end": None,
        "forecast_end": None,
        "percent_done": 0.0,
        "depends_on_wbs": [],
        "depends_on_ids": [],
    }
    return WbsRow(**{**fields, **extra})


def doc(rows: list[WbsRow], *, warning: str | None = None, scope: str = "Project") -> WbsDocument:
    return WbsDocument(
        project="alpha",
        scope_label=scope,
        milestone_id=None,
        generated_at=NOW,
        warning=warning,
        rows=rows,
    )


def milestone_tree() -> WbsDocument:
    return doc(
        [
            row(
                "m1",
                "1",
                issue_type="milestone",
                type_label="Milestone",
                name="PM reporting",
                percent_done=0.8125,
                planned_start=date(2026, 12, 1),
            ),
            row(
                "e1",
                "1.1",
                parent_id="m1",
                milestone_title="PM reporting",
                issue_type="epic",
                type_label="Epic",
                estimate_days=2.0,
                planned_start=date(2026, 12, 18),
                planned_end=date(2026, 12, 22),
                forecast_end=date(2026, 12, 23),
                percent_done=0.5,
            ),
            row(
                "t1",
                "1.1.1",
                parent_id="e1",
                milestone_title="PM reporting",
                name="=SUM(A1)",
                status="Blocked",
                blocked=True,
                depends_on_wbs=["1.1.2", "ext-9"],
                depends_on_ids=["t2", "ext-9"],
                assignee="alice",
                assignee_email="alice@example.com",
                points=3,
            ),
            row("t2", "1.1.2", parent_id="e1", milestone_title="PM reporting"),
        ]
    )


# REQ-MILESTONE-UI-029
def test_xlsx_structure_and_grouping() -> None:
    book = load_workbook(io.BytesIO(to_xlsx(milestone_tree())))
    assert book.sheetnames == ["WBS", "About"]
    sheet = book["WBS"]
    assert sheet.freeze_panes == "A2"
    assert sheet.auto_filter.ref == "A1:M5"
    assert [sheet.row_dimensions[r].outlineLevel for r in (2, 3, 4, 5)] == [0, 1, 2, 2]
    assert sheet["A2"].font.bold and not sheet["A3"].font.bold
    headers = [c.value for c in sheet[1]]
    assert headers[0] == "WBS" and headers[-1] == "Depends on"
    epic = {h: sheet.cell(3, i + 1) for i, h in enumerate(headers)}
    assert epic["Planned start"].value == datetime(2026, 12, 18)
    assert epic["Planned start"].number_format == "YYYY-MM-DD"
    assert epic["Forecast end"].value == datetime(2026, 12, 23)
    assert epic["% done"].value == 0.5 and epic["% done"].number_format == "0%"
    assert epic["Estimate (days)"].value == 2
    task = {h: sheet.cell(4, i + 1) for i, h in enumerate(headers)}
    assert task["Name"].value == "'=SUM(A1)"
    assert task["Depends on"].value == "1.1.2, ext-9"
    assert task["Points"].value == 3


# REQ-MILESTONE-UI-029
def test_xlsx_assumed_estimate_and_about_sheet() -> None:
    rows = [row("e3", "1", issue_type="epic", estimate_days=2.0, estimate_assumed=True)]
    book = load_workbook(io.BytesIO(to_xlsx(doc(rows, warning="gin show failed"))))
    assert book["WBS"]["H2"].value == "2 (assumed)"
    about = {r[0].value: r[1].value for r in book["About"].iter_rows()}
    assert about["Project"] == "alpha"
    assert about["Scope"] == "Project"
    assert about["generated_at"] == NOW.isoformat()
    assert about["Warning"] == "gin show failed"
    assert any(str(k).startswith("Definition:") for k in about)


# REQ-MILESTONE-UI-029
def test_xlsx_about_without_warning_and_milestone_scope() -> None:
    document = doc([], scope="PM reporting").model_copy(update={"milestone_id": "m1"})
    book = load_workbook(io.BytesIO(to_xlsx(document)))
    about = {r[0].value: r[1].value for r in book["About"].iter_rows()}
    assert about["Scope"] == "PM reporting (m1)"
    assert "Warning" not in about


# REQ-MILESTONE-UI-030
def test_csv_hierarchy_fix_version_estimate_label_and_blocker_links() -> None:
    text = to_csv(milestone_tree())
    raw = list(csv.reader(io.StringIO(text)))
    head = raw[0]
    assert head == [
        "Issue ID",
        "Parent ID",
        "Issue Type",
        "Summary",
        "Status",
        "Labels",
        "Assignee",
        "Story Points",
        "Original Estimate",
        "Start date",
        "Due date",
        "Fix Version",
        'Link "Blocks"',
        "WBS",
        "Forecast end",
        "% done",
        "Depends on",
        "Bead ID",
    ]
    by_bead = {r[-1]: r for r in raw[1:]}
    assert "m1" not in by_bead
    assert [r[-1] for r in raw[1:]] == ["e1", "t1", "t2"]
    e1, t1, t2 = by_bead["e1"], by_bead["t1"], by_bead["t2"]
    assert (e1[0], t1[0], t2[0]) == ("1", "2", "3")
    assert e1[1] == "" and t1[1] == "1" and t2[1] == "1"
    assert {e1[11], t1[11], t2[11]} == {"PM reporting"}
    assert e1[2] == "Epic" and t1[2] == "Task"
    assert e1[8] == "57600"
    assert (e1[9], e1[10], e1[14], e1[15]) == ("2026-12-18", "2026-12-22", "2026-12-23", "50%")
    assert t1[4] == "To Do" and t1[5] == "blocked"
    assert t1[3] == "'=SUM(A1)"
    assert t1[6] == "alice@example.com" and t1[7] == "3"
    assert t1[12] == ""
    assert t1[16] == "1.1.2, ext-9"
    assert t2[12] == "2"  # t2 blocks t1


# REQ-MILESTONE-UI-030
def test_csv_sub_task_levels() -> None:
    rows = [
        row("e9", "1", issue_type="epic", type_label="Epic"),
        row("t1", "1.1", parent_id="e9"),
        row("t1a", "1.1.1", parent_id="t1"),
        row("t1b", "1.1.1.1", parent_id="t1a"),
    ]
    raw = list(csv.reader(io.StringIO(to_csv(doc(rows)))))
    got = {r[-1]: (r[0], r[1], r[2]) for r in raw[1:]}
    assert got == {
        "e9": ("1", "", "Epic"),
        "t1": ("2", "1", "Task"),
        "t1a": ("3", "2", "Sub-task"),
        "t1b": ("4", "2", "Sub-task"),
    }


# REQ-MILESTONE-UI-030
def test_csv_repeated_link_columns_and_out_of_file_blocker() -> None:
    rows = [
        row("a", "1"),
        row("b", "2", depends_on_ids=["a", "gone"], depends_on_wbs=["1", "gone"]),
        row("c", "3", depends_on_ids=["a"], depends_on_wbs=["1"]),
    ]
    raw = list(csv.reader(io.StringIO(to_csv(doc(rows)))))
    head = raw[0]
    assert head.count('Link "Blocks"') == 2
    first = head.index('Link "Blocks"')
    a, b, c = raw[1:]
    assert a[first : first + 2] == ["2", "3"]
    assert b[first : first + 2] == ["", ""]
    assert c[first : first + 2] == ["", ""]
    assert b[head.index("Depends on")] == "1, gone"


# REQ-MILESTONE-UI-030
def test_csv_no_link_columns_when_nothing_blocks() -> None:
    head = list(csv.reader(io.StringIO(to_csv(doc([row("a", "1")])))))[0]
    assert 'Link "Blocks"' not in head
    assert head[-5:] == ["WBS", "Forecast end", "% done", "Depends on", "Bead ID"]


# REQ-MILESTONE-UI-030
def test_csv_type_status_assignee_and_estimate_mapping() -> None:
    rows = [
        row("m", "1", issue_type="milestone"),
        row("b1", "1.1", parent_id="m", issue_type="bug", status="Done", percent_done=1.0),
        row("t", "1.2", parent_id="m", status="In progress", assignee="bob", assignee_email="bob"),
        row("e", "1.3", parent_id="m", issue_type="epic", estimate_days=1.5, estimate_assumed=True),
        row("est", "1.4", parent_id="m", estimate_days=0.5),
    ]
    raw = list(csv.reader(io.StringIO(to_csv(doc(rows)))))
    got = {r[-1]: r for r in raw[1:]}
    assert (got["b1"][2], got["b1"][4], got["b1"][5], got["b1"][1]) == ("Bug", "Done", "", "")
    assert (got["t"][4], got["t"][6]) == ("In Progress", "bob")
    assert got["e"][8] == "43200"  # assumed estimate: seconds of the assumed value
    assert got["est"][8] == "14400"
    assert got["b1"][8] == "" and got["b1"][6] == ""
    assert got["b1"][14] == "100%"


# REQ-MILESTONE-UI-031
def test_markdown_heading_warning_and_escaping() -> None:
    rows = [row("t1", "1", name="Fix A | B\nnow")]
    text = to_markdown(doc(rows, warning="gin down"))
    lines = text.splitlines()
    assert lines[0] == "# alpha WBS — Project"
    assert "Generated: 2026-11-24 09:05 UTC" in lines
    assert "> Warning: gin down" in lines
    assert any("Fix A \\| B now" in line for line in lines)
    header = next(line for line in lines if line.startswith("| WBS"))
    assert header == (
        "| WBS | ID | Name | Type | Status | Assignee | Points | Estimate (days) "
        "| Planned start | Planned end | Forecast end | % done | Depends on |"
    )


# REQ-MILESTONE-UI-031
def test_markdown_without_warning_and_cell_formats() -> None:
    text = to_markdown(milestone_tree().model_copy(update={"warning": None}))
    assert "Warning" not in text
    assert (
        "| 1.1 | e1 | e1 | Epic | Open | Unassigned |  | 2 | 2026-12-18 | 2026-12-22 "
        "| 2026-12-23 | 50% |  |" in text
    )
    assert (
        "| 1.1.1 | t1 | =SUM(A1) | Task | Blocked | alice | 3 |  |  |  |  | 0% | 1.1.2, ext-9 |"
        in text
    )
    assumed = to_markdown(doc([row("e", "1", estimate_days=2.0, estimate_assumed=True)]))
    assert "| 2 (assumed) |" in assumed


# REQ-MILESTONE-UI-030, REQ-MILESTONE-UI-031
def test_percent_rounds_half_up() -> None:
    rows = [row("t", "1", percent_done=0.125)]
    assert "| 13% |" in to_markdown(doc(rows))
    assert list(csv.reader(io.StringIO(to_csv(doc(rows)))))[1][-3] == "13%"


# REQ-MILESTONE-UI-029
def test_xlsx_strips_control_characters() -> None:
    rows = [row("t", "1", name="bad\x00title\x07")]
    book = load_workbook(io.BytesIO(to_xlsx(doc(rows))))
    assert book["WBS"]["C2"].value == "badtitle"


# REQ-MILESTONE-UI-031
def test_markdown_heading_and_backslash_escaping() -> None:
    document = doc([row("t", "1", name="a\\|b")], scope="Line one\nLine two")
    lines = to_markdown(document).splitlines()
    assert lines[0] == "# alpha WBS — Line one Line two"
    assert any("a\\\\\\|b" in line for line in lines)


# REQ-MILESTONE-UI-030
@pytest.mark.parametrize("lead", ["+", "-", "@"])
def test_csv_guards_fix_version_assignee_and_depends_on(lead: str) -> None:
    rows = [
        row(
            "t",
            "1",
            milestone_title=f"{lead}ms",
            assignee_email=f"{lead}who",
            depends_on_wbs=[f"{lead}dep"],
        )
    ]
    head, record = list(csv.reader(io.StringIO(to_csv(doc(rows)))))
    assert record[head.index("Fix Version")] == f"'{lead}ms"
    assert record[head.index("Assignee")] == f"'{lead}who"
    assert record[head.index("Depends on")] == f"'{lead}dep"
