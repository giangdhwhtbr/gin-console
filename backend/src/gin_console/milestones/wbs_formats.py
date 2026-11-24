"""Serialize a WBS document as Excel, CSV for Jira, or Markdown (REQ-MILESTONE-UI-029,
REQ-MILESTONE-UI-030, REQ-MILESTONE-UI-031).
Pure: no HTTP, no files; the workbook is built in memory."""

import csv
import io
import math
from datetime import UTC, date
from typing import Any

from openpyxl import Workbook
from openpyxl.cell.cell import ILLEGAL_CHARACTERS_RE
from openpyxl.styles import Font

from gin_console.milestones.wbs import WbsDocument, WbsRow

SECONDS_PER_DAY = 28800
HEADERS = [
    "WBS",
    "ID",
    "Name",
    "Type",
    "Status",
    "Assignee",
    "Points",
    "Estimate (days)",
    "Planned start",
    "Planned end",
    "Forecast end",
    "% done",
    "Depends on",
]
DEFINITIONS = [
    ("Done", "Bead closed (is_done)"),
    ("Blocked", "Open bead with an open blocker (is_blocked)"),
    ("Progress", "% done: milestones by burn-up points, epics by closed tracks, tasks 0% or 100%"),
    ("Assignee", "Normalized assignee handle; the owner field is never read"),
    (
        "Estimate",
        "Days; tasks use estimated_minutes / 480; '(assumed)' marks a gin assumed estimate",
    ),
]
JIRA_STATUS = {"Done": "Done", "In progress": "In Progress", "Open": "To Do", "Blocked": "To Do"}


def _safe_cell(value: str) -> str:
    """Prefix a text cell that a spreadsheet would read as a formula."""
    return "'" + value if value[:1] in ("=", "+", "-", "@") else value


def _xlsx_text(value: str) -> str:
    """Drop the control characters openpyxl rejects, then guard against formulas."""
    return _safe_cell(ILLEGAL_CHARACTERS_RE.sub("", value))


def _days(value: float) -> str:
    return f"{value:g}"


def _estimate_text(row: WbsRow) -> str:
    if row.estimate_days is None:
        return ""
    text = _days(row.estimate_days)
    return f"{text} (assumed)" if row.estimate_assumed else text


def _percent_text(row: WbsRow) -> str:
    return "" if row.percent_done is None else f"{math.floor(row.percent_done * 100 + 0.5)}%"


def _iso(value: date | None) -> str:
    return value.isoformat() if value else ""


def _depends(row: WbsRow) -> str:
    return ", ".join(row.depends_on_wbs)


def to_xlsx(doc: WbsDocument) -> bytes:
    book = Workbook()
    sheet: Any = book.active
    sheet.title = "WBS"
    sheet.append(HEADERS)
    for cell in sheet[1]:
        cell.font = Font(bold=True)
    for row in doc.rows:
        estimate: float | str | None = row.estimate_days
        if row.estimate_assumed:
            estimate = _estimate_text(row)
        sheet.append(
            [
                _xlsx_text(row.wbs),
                _xlsx_text(row.id),
                _xlsx_text(row.name),
                _xlsx_text(row.type_label),
                row.status,
                _xlsx_text(row.assignee),
                row.points,
                estimate,
                row.planned_start,
                row.planned_end,
                row.forecast_end,
                row.percent_done,
                _xlsx_text(_depends(row)),
            ]
        )
        number = sheet.max_row
        for column in (9, 10, 11):
            sheet.cell(number, column).number_format = "YYYY-MM-DD"
        sheet.cell(number, 12).number_format = "0%"
        sheet.row_dimensions[number].outlineLevel = max(0, row.level - 1)
        if row.level == 1:
            for cell in sheet[number]:
                cell.font = Font(bold=True)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:{sheet.cell(1, len(HEADERS)).column_letter}{sheet.max_row}"

    about: Any = book.create_sheet("About")
    scope = doc.scope_label + (f" ({doc.milestone_id})" if doc.milestone_id else "")
    about.append(["Project", _xlsx_text(doc.project)])
    about.append(["Scope", _xlsx_text(scope)])
    about.append(["generated_at", doc.generated_at.isoformat()])
    for name, text in DEFINITIONS:
        about.append([f"Definition: {name}", text])
    if doc.warning:
        about.append(["Warning", _xlsx_text(doc.warning)])
    out = io.BytesIO()
    book.save(out)
    return out.getvalue()


def _jira_rows(doc: WbsDocument) -> list[tuple[int, WbsRow]]:
    """Issue rows (milestones left out) with their position from 1."""
    issues = [r for r in doc.rows if r.issue_type != "milestone"]
    return list(enumerate(issues, 1))


def to_csv(doc: WbsDocument) -> str:
    by_id = {r.id: r for r in doc.rows}
    numbered = _jira_rows(doc)
    issue_no = {r.id: n for n, r in numbered}

    def jira_type(row: WbsRow) -> str:
        parent = by_id.get(row.parent_id) if row.parent_id else None
        if parent is not None and parent.issue_type not in ("epic", "milestone"):
            return "Sub-task"
        return {"epic": "Epic", "bug": "Bug"}.get(row.issue_type, "Task")

    def parent_no(row: WbsRow) -> str:
        current = by_id.get(row.parent_id) if row.parent_id else None
        while current is not None and jira_type(current) == "Sub-task":
            current = by_id.get(current.parent_id) if current.parent_id else None
        if jira_type(row) == "Epic" or current is None or current.id not in issue_no:
            return ""
        return str(issue_no[current.id])

    blocks: dict[str, list[int]] = {}  # blocker bead id -> issue ids it blocks
    for number, row in numbered:
        for blocker in row.depends_on_ids:
            if blocker in issue_no:
                blocks.setdefault(blocker, []).append(number)
    width = max((len(v) for v in blocks.values()), default=0)

    head = [
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
        *['Link "Blocks"'] * width,
        "WBS",
        "Forecast end",
        "% done",
        "Depends on",
        "Bead ID",
    ]
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(head)
    for number, row in numbered:
        links = [str(n) for n in blocks.get(row.id, [])]
        links += [""] * (width - len(links))
        estimate = (
            "" if row.estimate_days is None else str(round(row.estimate_days * SECONDS_PER_DAY))
        )
        cells = [
            str(number),
            parent_no(row),
            jira_type(row),
            row.name,
            JIRA_STATUS[row.status],
            "blocked" if row.blocked else "",
            row.assignee_email or "",
            "" if row.points is None else str(row.points),
            estimate,
            _iso(row.planned_start),
            _iso(row.planned_end),
            row.milestone_title or "",
            *links,
            row.wbs,
            _iso(row.forecast_end),
            _percent_text(row),
            _depends(row),
            row.id,
        ]
        writer.writerow([_safe_cell(c) for c in cells])
    return out.getvalue()


def _md_cell(value: str) -> str:
    return " ".join(value.splitlines()).replace("\\", "\\\\").replace("|", "\\|")


def to_markdown(doc: WbsDocument) -> str:
    stamp = doc.generated_at
    if stamp.tzinfo is not None:
        stamp = stamp.astimezone(UTC)
    lines = [
        f"# {_md_cell(doc.project)} WBS — {_md_cell(doc.scope_label)}",
        "",
        f"Generated: {stamp:%Y-%m-%d %H:%M} UTC",
        "",
    ]
    if doc.warning:
        lines += [f"> Warning: {_md_cell(doc.warning)}", ""]
    lines.append("| " + " | ".join(HEADERS) + " |")
    lines.append("|" + "|".join(" --- " for _ in HEADERS) + "|")
    for row in doc.rows:
        cells = [
            row.wbs,
            row.id,
            row.name,
            row.type_label,
            row.status,
            row.assignee,
            "" if row.points is None else str(row.points),
            _estimate_text(row),
            _iso(row.planned_start),
            _iso(row.planned_end),
            _iso(row.forecast_end),
            _percent_text(row),
            _depends(row),
        ]
        lines.append("| " + " | ".join(_md_cell(c) for c in cells) + " |")
    return "\n".join(lines) + "\n"
