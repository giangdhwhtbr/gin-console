# Remove AI usage from Reports

Epic: gin-console-5c4
Kind: capability
Date: 2026-11-22

## Why

gin-workflow retired AI usage tracking (epic gin-workflow-wkwb, decision 2026-11-21, shipped in gin 3.4.0 at master 65c5631f):
- `gin usage collect` cost about 10 minutes per 6-track epic and missed most of the work.
- Nothing writes `metadata.ai_usage` any more, and `gin usage` is gone.
- Reports still reads that metadata. Its Data coverage tab now tells the user to run a command that no longer exists.

The tabs AI usage, Quality and Data coverage, and the Team tab's Rework figure and columns, all depend on `ai_usage`. Only `totals.closed`, the Delivery section and `errors` do not.

User decisions 2026-11-22:
- **Summary:** confirmed as written in the epic and its one comment (the gin-workflow side shipped on 2026-11-21).
- **Quality signals:** compute rework from Beads.
  - Reopens come from `.beads/interactions.jsonl`; a reopen is a status change from `closed`.
  - Bugs come from `discovered-from` dependencies.
  - Rework is reopens + bugs.
  - Review cycles, rejections, findings and waivers move to epic gin-console-rm-review-audit.
- **Caching:** compute on demand with no interval cache. Measured on the running service:
  - a 90-day report takes 19–144 ms per project;
  - "All projects" takes 194 ms;
  - parsing an interaction log of 940 lines takes about 4 ms.
  - The log is cached and read again only when the file changes, as `SnapshotStore` does.

Comments considered: 1, latest 2026-11-21T12:51:14Z

## What Changes

- **Backend:**
  - Remove `parse_usage`, the own share, the usage, coverage and budget models, and the `gin usage collect` hint.
  - Add an interaction-log reader for reopens.
  - Count bugs found later from `discovered-from`.
  - The report holds `totals {closed, rework_rate}`, `delivery`, `quality {members, epics}` and `errors`.
  - The Team fields `rework`, `rework_rate`, `reopens` and `bugs` keep their names but come from Beads; `rework` is never `null`.
- **Frontend:**
  - The tabs are Team, Delivery, Velocity and Quality.
  - AI usage and Data coverage are gone; old links with `tab=usage` or `tab=coverage` open Team.
  - Failed projects show as a warning above the tabs.
  - The Quality tab shows rework rate, reopens, bugs found later, and member and epic tables.
  - No tokens, cost or budget appear anywhere.
- **Example data:** `scripts/make_example_project.py` stops writing `ai_usage` and writes a few reopens and `discovered-from` bugs instead.
- **Roadmap and related epics:** the wording about AI usage in epics gin-console-rm-reports-status and gin-console-rm-review-audit and in the shipped retire epic is updated (done with this spec).

## User Stories

### US-1: No dead AI usage
As a PM, I want Reports to show no tokens, cost, budget or usage coverage, and no `gin usage` command, so that nothing on the page points at data or tools that no longer exist.
REQ: REQ-REPORTS-001, REQ-UI-088, REQ-UI-095, REQ-UI-129

Acceptance criteria:
- The report answer has no `usage` or `coverage` key, and `totals` holds only `closed` and `rework_rate`.
- The tab list and the sidebar sections read Team, Delivery, Velocity and Quality.
- `/reports?project=alpha&tab=coverage` opens the Team tab.

### US-2: Rework from Beads
As a team lead, I want the rework rate, reopens and bugs found later to come from Beads, so that they stay right after AI usage tracking stopped.
REQ: REQ-REPORTS-019, REQ-REPORTS-005, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-016, REQ-UI-091

Acceptance criteria:
- A bead reopened twice in `.beads/interactions.jsonl` counts 2 reopens.
- A bead with two `discovered-from` bugs counts 2 bugs.
- A project without an interaction log counts no reopens and still shows its report.
- The Quality tab shows the rework rate, reopens, bugs found later, the member table and the epic table, and no tokens or review cycles.
- The Team tab's Rework figure, KPI column and Closed-list column show numbers, never "—" for a closed bead.

### US-3: Failed projects still visible
As a PM, I want a warning above the tabs to name each project that failed, so that I still see partial results now that Data coverage is gone.
REQ: REQ-REPORTS-007, REQ-UI-093

Acceptance criteria:
- With "All projects" and `beta` failing, a warning above the tabs names `beta` and its error on every tab, and the sections show the other projects.

## Capabilities Affected

- `reports`:
  - ADDED: REQ-REPORTS-019.
  - MODIFIED: REQ-REPORTS-001, REQ-REPORTS-005, REQ-REPORTS-007, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-016.
  - REMOVED: REQ-REPORTS-002, REQ-REPORTS-003, REQ-REPORTS-006.
  - Diagrams: `docs/specs/reports/diagrams/rework-activity.md`.
  - Use cases: `docs/specs/reports/use-cases/review-rework.md`.
- `ui`:
  - MODIFIED: REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129.
  - REMOVED: REQ-UI-089, REQ-UI-092.
- Assets: none.

## Assumptions

- **Tab name:** the Quality tab keeps its name. Epic gin-console-rm-reports-status renames it Rework with its section redesign.
- **Bugs found later:** every bug bead with a `discovered-from` dependency on the bead counts, open or closed, as on the bead page (REQ-UI-086).
- **Reopens history:** the interaction log starts in October 2026 (gin-workflow on 2026-10-01, gin-console on 2026-10-12), so older reopens are not counted.
- **Real reopen data:** today only qwikfone has reopens (14); the example project gets generated ones.
- **Epic rows:** the 10 epics with the most rework, then the most closed beads.
- **Obsolete QA cases:** the cases pinned to the removed REQs (TC-REPORTS-046 to 049, TC-UI-078 to 080) and their tests are deleted; approving this spec approves that deletion.
- **Old metadata:** `ai_usage` left in existing beads' metadata is ignored and not removed (the console stays read-only).
- **Deploy:** the API shape changes, so the deployed frontend must be rebuilt with the backend.

## Non-goals

- Review cycles, rejections, findings and waivers (epic gin-console-rm-review-audit).
- Renaming Quality to Rework and the report section redesign (epic gin-console-rm-reports-status).
- Caching `GET /api/milestones` (1.26 s, a `gin milestone list` process); this is a separate item if wanted.
- Any change in gin-workflow.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-5c4 --against master` prints `ok`, and `gin specs trace --change gin-console-5c4` lists no missing REQ.
- `grep -rn "ai_usage\|gin usage" backend/src frontend/src` finds nothing.
- TC-1 passes on the deployed console:
  - no AI usage or Data coverage tab;
  - Quality numbers for `example` and qwikfone;
  - the failed-project warning above the tabs.
