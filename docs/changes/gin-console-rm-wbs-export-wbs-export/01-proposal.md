# WBS export and summary

Epic: gin-console-rm-wbs-export
Kind: capability
Points: 5 (5 stories, 9 new REQs, 1 WBS endpoint in 3 formats with openpyxl and Jira CSV, 2 UI menus and Copy summary; medium)
Date: 2026-11-24

## Why

A PM needs to hand a structured work breakdown (WBS) and a status summary to stakeholders and import tasks into external trackers such as Jira without copying rows by hand from multiple screens. Today gin-console has no export or download capability and no way to copy the Reports Status view as a formatted summary.

Comments on the epic before this discuss:
- **gin-console-rm-definitions shipped** (merge `8a13790`, 2026-11-22): established one meaning for done (`is_done`), blocked (`is_blocked`), epic progress (`child_counts` over tracks only), assignee (real assignee or "Unassigned", never `owner`, REQ-UI-135), one date format, and plain labels. WBS export and Copy summary follow all of these rules.
- **Sibling epic gin-console-rm-reports-status shipped** (`e45ba6a`, 2026-11-24): added the Reports Status section with verdict, KPIs, risks, and epic table, giving Copy summary its exact data source in the frontend.

Comments considered: 1, latest 2026-11-22T06:59:32Z

User decisions 2026-11-24:
- **Summary:** confirmed as written.
- **Project-wide export placement:** on the Milestones list page header (in addition to the Milestone page header for milestone-scoped export).
- **Included beads:** every bead in scope, open and closed, excluding prep tasks and merge gates (matching `child_counts`).
- **Estimate column:** days for epics from `gin` (marked `(assumed)` when assumed); sum of epics for milestones; `estimate_minutes` converted to days for tasks when set, else blank.
- **Architecture:** build WBS files in the backend (`GET /api/milestones/{project}/wbs`) using `openpyxl` for Excel; Copy summary is frontend-only.
- **CSV format:** one CSV format in Jira External System Import layout (`Issue ID`, `Parent ID`, `Issue Type`, `Summary`, `Status`, `Labels`, `Assignee`, `Story Points`, `Original Estimate` in seconds, `Start date`, `Due date`, `Fix Version`, `Link "Blocks"`), with WBS columns appended at the end.

## What Changes

- **Backend (`milestones` context):**
  - New `milestones/wbs.py` building ordered, numbered `WbsRow` trees from the Beads snapshot (`definitions.py` rules) joined with `gin milestone list` and `gin milestone show` dates/estimates.
  - New `milestones/wbs_formats.py` serializing `WbsRow`s to Excel (`.xlsx` via `openpyxl`, outline-grouped by level, plus an `About` sheet), CSV for Jira (`.csv`), and Markdown (`.md`).
  - New endpoint `GET /api/milestones/{project}/wbs?format=xlsx|csv|md[&milestone=<id>]` returning a downloadable attachment, with graceful degradation when `gin` is unavailable.
  - New backend dependency: `openpyxl`.
- **Frontend (`milestone-ui`):**
  - New `ExportWbsMenu` component (Excel, CSV for Jira, Markdown direct download links) in the Milestone page header (milestone-scoped) and the Milestones list page header (project-scoped).
- **Frontend (`reports`):**
  - New `summaryMarkdown()` formatter and `CopySummaryButton` in the Reports Status section header, copying the verdict, KPIs, risks, and epic table as Markdown with "Copied" / error feedback.

## User Stories

### US-1: Download a milestone WBS in Excel
As a PM, I want to download a milestone's work breakdown as an Excel workbook with rows grouped by level, so that I can collapse levels and share it in stakeholder reports.
REQ: REQ-MILESTONE-UI-026, REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028, REQ-MILESTONE-UI-029, REQ-MILESTONE-UI-032

Acceptance criteria:
- The Milestone page header shows an "Export WBS" menu with Excel, CSV for Jira, and Markdown options.
- Downloading Excel returns `<project>-<milestone>-wbs-<YYYY-MM-DD>.xlsx` with a `WBS` sheet (frozen header, autofilter, outline-grouped rows `1` / `1.1` / `1.1.1`, real date and percent cells) and an `About` sheet.
- Prep tasks and merge gates are excluded; closed beads are included with 100% done; the person column shows assignee or "Unassigned", never `owner`.

### US-2: Download a project-wide WBS
As a PM, I want to download a WBS for the whole project from the Milestones list page, so that I have one breakdown covering all milestones and unassigned epics.
REQ: REQ-MILESTONE-UI-026, REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028, REQ-MILESTONE-UI-032

Acceptance criteria:
- The Milestones list page header shows an "Export WBS" menu.
- Project-wide export orders milestones first (by start date, then id), followed by epics without a milestone, followed by parentless non-epic beads.
- Filename is `<project>-wbs-<YYYY-MM-DD>.<ext>`.

### US-3: Export WBS as CSV for Jira import
As a PM, I want the CSV export formatted for Jira's External System Import, so that I can import epics, tasks, bugs, estimates, dates, and blocker links directly into Jira.
REQ: REQ-MILESTONE-UI-026, REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028, REQ-MILESTONE-UI-030

Acceptance criteria:
- CSV uses Jira columns (`Issue ID`, `Parent ID`, `Issue Type`, `Summary`, `Status`, `Labels`, `Assignee`, `Story Points`, `Original Estimate`, `Start date`, `Due date`, `Fix Version`, `Link "Blocks"`) with WBS columns appended at the end.
- Milestones appear as `Fix Version` on their child issues rather than as issue rows; parents always precede children; estimates are in seconds (`1 day = 28800`); blocked beads carry the `blocked` label.
- Cells starting with `=`, `+`, `-`, `@` are guarded against spreadsheet formula injection.

### US-4: Export WBS as Markdown and handle degraded gin CLI
As a PM, I want a Markdown WBS export and a fallback when `gin` is unavailable, so that I can paste a table into docs or still get a WBS from Beads data alone if `gin` fails.
REQ: REQ-MILESTONE-UI-026, REQ-MILESTONE-UI-031

Acceptance criteria:
- Markdown export starts with `# <project> WBS — <scope>`, a generated-at line, and a table with the same columns as Excel, with pipes and newlines escaped.
- If `gin milestone list` or `gin milestone show` fails, all three formats still return HTTP 200 with Beads data, blank planned/forecast dates and gin estimates, and a warning (`X-WBS-Warning` header, `About` sheet in Excel, header note in Markdown).

### US-5: Copy milestone status summary on Reports
As a PM, I want a "Copy summary" button on the Reports Status section, so that I can paste the milestone's verdict, KPIs, risks, and epic table as Markdown into my own status update.
REQ: REQ-REPORTS-037, REQ-REPORTS-038

Acceptance criteria:
- When a milestone is loaded on `/reports/status`, a "Copy summary" button appears in the Status header; it is hidden on period scopes or while loading/errored.
- Clicking it copies Markdown containing the milestone title and dates, verdict and sentence, 5 KPIs (with week-on-week changes when present), risks (or `None.`), and the epic table in `EpicTable` order.
- The button shows "Copied" for 2 seconds on success, or an inline "Couldn't copy" error if clipboard write fails.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `milestone-ui` | `REQ-MILESTONE-UI-026`, `REQ-MILESTONE-UI-027`, `REQ-MILESTONE-UI-028`, `REQ-MILESTONE-UI-029`, `REQ-MILESTONE-UI-030`, `REQ-MILESTONE-UI-031`, `REQ-MILESTONE-UI-032` | `docs/specs/milestone-ui/diagrams/wbs-export-activity.md`, `docs/specs/milestone-ui/use-cases/export-wbs.md` |
| `reports` | `REQ-REPORTS-037`, `REQ-REPORTS-038` | `docs/specs/reports/use-cases/review-milestone-status.md`, `docs/specs/reports/diagrams/status-section-activity.md` |

## Non-goals

- MS Project (`.mpp` / `.xml`) or PDF export.
- Persisting or editing WBS baselines; the console remains strictly read-only.
- Copy summary on date-range scopes or on non-Status report sections.
- A separate non-Jira CSV format.

## Success Criteria

- `GET /api/milestones/{project}/wbs` returns valid `.xlsx`, `.csv`, and `.md` downloads for both project and milestone scopes, tested with fakes and no real `gin`/`bd` execution.
- `openpyxl` opens the generated `.xlsx` with outline levels, dates, percentages, and the `About` sheet intact.
- `ExportWbsMenu` is available on both the Milestone page and the Milestones list page.
- `CopySummaryButton` copies accurate Markdown from `StatusSection` and handles clipboard success and failure.
- Backend (`pytest`, `ruff`, `mypy`) and frontend (`vitest`, `typecheck`, `lint`, `build`) pass with REQ-IDs traced in tests.
