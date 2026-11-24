# Reports status and one scope

Epic: gin-console-rm-reports-status
Kind: capability
Points: 13 (8 stories, 17 new and 16 changed REQs, 1 new section with 5 panels, 1 new endpoint rebuilding scope history, a shared scope for 5 sections and 3 endpoints, section paths, team KPI v2; medium)
Date: 2026-11-23

## Why

The PM walkthrough of 2026-11-21 found that Reports cannot answer "how is this milestone doing?" on one screen:
- There is no verdict. A PM reads four tabs and works out the answer alone.
- There is no burn-up, so nobody sees done work against a scope that grows.
- Each tab picks its scope its own way: Team uses a milestone, Delivery and Quality use 7, 30 or 90 days and a sprint field, and Velocity has none. One page shows three scopes at once.
- Scope changes after kickoff, blocked chains, epics without an estimate and specs not yet approved are spread over the Gantt, the Beads page and the CLI.
- The Team tab counts beads only. It says nothing about points delivered, about how good the estimates were, or about the trend over milestones.

The direction preview of 2026-11-21 ("Strung") already draws the answer: a Status section with a verdict, KPIs with the change since last week, a burn-up, the changes since kickoff, the risks and an epic table with a verdict per epic. It is kept as the confirmed asset `docs/specs/ui/assets/2026-11-22/` (board `reports`). The rm-strung discuss marked that board as direction for a later epic; this is that epic.

Comments on the epic before this discuss:
- **AI usage retired** (2026-11-21): epic gin-console-5c4 shipped on 2026-11-22. Reports now has the tabs Team, Delivery, Velocity and Quality, and rework comes from Beads (reopens and bugs found later). The preview's "AI usage" section is gone; review cycles and waivers belong to epic gin-console-rm-review-audit.
- **gin-console-rm-definitions shipped** (merge 8a13790): one blocked rule (`is_blocked`), `child_counts`, one person per handle and email, one late rule (REQ-MILESTONE-UI-023), one date format, plain labels ("Spec not approved yet") and the Legend on Reports. This epic uses all of them.
- **gin-console-rm-strung shipped** (merge 564fb99): the `Strand` and `StateGlyph` components, one verdict per Gantt row (`verdictOf`) and the palette. The Status epic table reuses them.

Comments considered: 3, latest 2026-11-22T23:44:50Z

User decisions 2026-11-23:
- **Summary:** confirmed as written above.
- **Scope of the epic:** Team KPI v2 stays in this epic.
- **Addresses:** each section has its own path, `/reports/status`, `/reports/team`, `/reports/delivery`, `/reports/velocity` and `/reports/rework`. Old `?tab=` links are replaced.
- **One scope:** a milestone (default: the current one) or the last 7, 30 or 90 days. The sprint field goes.
- **Planned and forecast dates:** Planned is the Gantt's date range of the epic (`gin milestone show`). Forecast is the epic's end in the forecast from today (`forecast.epics` of `gin milestone list`), or its close date. No baseline is stored at kickoff.
- **Verdict:** keeps the one late rule. Late is REQ-MILESTONE-UI-023. At risk is not late but behind: the finish at today's pace is after the end, nothing closed lately while work is open, a bead is blocked, or an open epic has no estimate.
- **Burn-up:** in points. The scope is the points of the milestone's epics on each day. Done counts an epic's points by the share of its tracks closed, and full points once the epic is closed. Splitting an epic into tracks does not move the scope line.
- **Points per member:** an epic's points are shared among the members by their share of its closed tracks; an epic without tracks counts for its assignee.
- **Approach:** a new snapshot-only endpoint `GET /api/reports/status`. The frontend joins it with the Milestones list and the milestone detail, which the console already calls and caches. The Reports backend still never runs `gin`.

## What Changes

- **Sections and addresses:**
  - Reports has five sections: Status (new, the default), Team, Delivery, Velocity and Rework (Quality renamed).
  - Each section has its own path. `/reports` opens Status.
  - Old `?tab=` links are replaced by the section's path, and `tab=quality` by Rework.
  - The sidebar lists the sections under Reports with their headlines from 1024px; narrower windows show them as tabs.
- **One scope:**
  - One picker at the top of every section: a milestone, or the last 7, 30 or 90 days. It is kept in the URL as `milestone` or `days` and stays when the section changes.
  - `/api/reports` takes `milestone` instead of `sprint`.
  - `/api/reports/team` takes `days`.
  - Velocity marks the selected milestone.
- **Status section:**
  - The verdict and its sentence.
  - Five KPIs with the change since last week: beads done, points done, pace, blocked and rework.
  - A burn-up in points with the needed pace and the forecast.
  - The changes since kickoff.
  - The risks.
  - The epic table: verdict, strand, planned and forecast dates, and owner.
- **Team KPI v2:**
  - Points delivered and estimate accuracy for the team and per member.
  - "Across milestones", a trend of the last 6 milestones.
  - A note when unassigned work makes the member numbers undercount.
- **API:**
  - New `GET /api/reports/status`.
  - The Milestones list keeps the forecast's `epics` (REQ-MILESTONE-UI-008).
  - The reports source reads `metadata.milestone_moves`, `metadata.points_history`, the milestone's `kickoff` and `planned_days_per_point`, the dependencies' `created_at` and the reopen dates.

## User Stories

### US-1: Status of a milestone on one screen
As a PM, I want one verdict for the milestone, with the reason, so that I know at once whether it will finish by its end date.
REQ: REQ-REPORTS-020, REQ-REPORTS-027, REQ-REPORTS-028, REQ-REPORTS-032

Acceptance criteria:
- `/reports/status?project=example&milestone=m2` opens with the milestone's title, its dates and "Working day 8 of 16".
- An open milestone whose forecast finish is after its end reads "Late", in the warning colour.
- An open milestone that is not late, with a blocked bead, reads "At risk".
- The verdict sentence names the finish at today's pace, its distance from the end in working days, and the finish of the epic estimates.
- A closed milestone reads "Finished on time" or "Finished 2 d late".

### US-2: KPIs with the change since last week
As a PM, I want each KPI to show how it moved since last week, so that I see the trend without opening last week's report.
REQ: REQ-REPORTS-023, REQ-REPORTS-028

Acceptance criteria:
- Beads done reads "13 of 35" and "+6 this week" when 7 of the 13 were closed a week ago.
- Points done shows the points added after kickoff.
- Pace shows the pace needed to end on the end date, in the warning colour when it is above the pace.
- Blocked shows the oldest wait in working days.
- Rework shows "up from 18% last week" in the warning colour when it rose.
- A milestone that kicked off less than 7 days ago shows no change line.

### US-3: Burn-up of done against scope
As a PM, I want a burn-up in points with the scope line, the needed pace and the forecast, so that I see whether done work catches up with a scope that grows.
REQ: REQ-REPORTS-021, REQ-REPORTS-022, REQ-REPORTS-029

Acceptance criteria:
- An epic moved into the milestone after kickoff raises the scope line on the day of the move.
- An epic re-estimated from 5 to 8 points raises the scope line by 3 on that day.
- Splitting an epic into tracks does not move the scope line.
- An epic with 2 of 4 tracks closed counts half its points as done; a closed epic counts all of them.
- The chart marks Today and the End, and shades the days after the end.

### US-4: What changed and what could move the finish
As a PM, I want the changes since kickoff and the risks listed next to the burn-up, so that I can explain a slip and act on it.
REQ: REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-030

Acceptance criteria:
- An epic moved in after kickoff, a re-estimate and a bug created under the milestone after kickoff are each one line, newest first, under "Scope 24 → 27 points".
- Tracks created by splitting an epic are not listed.
- A blocked bead reads "<bead> waits on <blocker>", with "<blocker> is blocked too" when it is, the blocker's person and the working days waited.
- Open epics without points are one risk line with up to 3 titles and "n more".
- Epics whose spec is not approved yet are one risk line, taken from the milestone detail.

### US-5: Every epic with its verdict and dates
As a PM, I want a table of the milestone's epics with their verdict, progress, planned and forecast dates and owner, so that I see which epic drives the finish date.
REQ: REQ-REPORTS-026, REQ-REPORTS-031, REQ-MILESTONE-UI-008

Acceptance criteria:
- Each epic row shows the Gantt's verdict for it (REQ-MILESTONE-UI-024), its strand ("Not split yet" without tracks), its planned range, its forecast end and its owner or "Unassigned".
- An open epic's forecast is its end in the forecast from today, with "?" when its estimate is assumed; a closed epic's forecast is its close date.
- Rows are ordered by planned start, and each title opens the epic's page.
- When the milestone detail fails, the table still shows the epics, with "—" for planned, forecast and verdict.

### US-6: One scope for every section
As a PM, I want to pick a milestone or a period once and see every section of Reports for it, so that the numbers of the sections agree.
REQ: REQ-REPORTS-001, REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-012, REQ-REPORTS-017, REQ-REPORTS-018, REQ-REPORTS-033, REQ-UI-088, REQ-UI-093

Acceptance criteria:
- Picking milestone `m2` on Team and then opening Delivery shows the beads of `m2` closed whatever their close date.
- Picking "Last 30 days" on Delivery and then opening Status shows the KPIs for the 30 days and "Pick a milestone to see the verdict, burn-up and epics".
- The URL holds either `milestone` or `days`, never both, and no `sprint`.
- A project without milestones opens on the last 30 days.
- Velocity marks the selected milestone in its charts and table.

### US-7: Report sections with their own addresses
As a PM, I want each report section to have its own address in the sidebar, so that I can link a colleague to the Status of a milestone.
REQ: REQ-UI-063, REQ-UI-091, REQ-UI-095, REQ-UI-129

Acceptance criteria:
- From 1024px with the sidebar expanded, the sidebar lists Status, Team, Delivery, Velocity and Rework under Reports, each with its headline, and the current one is marked.
- `/reports?project=a&tab=quality&days=7` becomes `/reports/rework?project=a&days=7` without a new history entry.
- `/reports` becomes `/reports/status`.
- The document title reads `Reports · Status · example · gin-console`.
- Below 1024px the sections show as tabs that link to the same paths.

### US-8: Team KPI v2
As a team lead, I want points delivered, estimate accuracy and a trend over milestones, led by the team numbers, so that I can see how the team delivers without ranking people.
REQ: REQ-REPORTS-010, REQ-REPORTS-013, REQ-REPORTS-015, REQ-REPORTS-034, REQ-REPORTS-035, REQ-REPORTS-036

Acceptance criteria:
- The team figures show Points delivered and Estimate accuracy.
- An epic of 8 points whose 4 tracks were closed 3 by `ann` and 1 by `bao` counts 6 points for `ann` and 2 for `bao`.
- Accuracy follows gin-workflow: the planned days per point ÷ the actual days per point; a team value of 1.08 reads "1.08, faster than planned".
- "Across milestones" lists the last 6 started milestones, oldest first, with closed beads, points, on time, rework and accuracy, and marks the selected one.
- With 8 of 30 closed beads unassigned, a note above the member table says the member numbers undercount.
- The member table keeps its order by assigned beads.

## Capabilities Affected

- `reports`:
  - ADDED: REQ-REPORTS-020 to REQ-REPORTS-036.
  - MODIFIED: REQ-REPORTS-001, REQ-REPORTS-008, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-015, REQ-REPORTS-017, REQ-REPORTS-018.
  - Diagrams: `docs/specs/reports/diagrams/status-section-activity.md`, `docs/specs/reports/diagrams/status-verdict-state.md`, `docs/specs/reports/diagrams/team-tab-activity.md` (updated).
  - Use cases: `docs/specs/reports/use-cases/review-milestone-status.md`, `docs/specs/reports/use-cases/review-team-in-milestone.md` (updated).
- `ui`:
  - MODIFIED: REQ-UI-063, REQ-UI-088, REQ-UI-091, REQ-UI-093, REQ-UI-095, REQ-UI-129.
- `milestone-ui`:
  - MODIFIED: REQ-MILESTONE-UI-008.
- Assets: `docs/specs/ui/assets/2026-11-22/index.html#reports` and `docs/specs/ui/assets/2026-11-22/reports-light.png` (confirmed 2026-11-22), cited as the source of the Status layout. No new asset folder.

## Assumptions

- **Week ago:** "last week" is today minus 7 calendar days. The change line is left out when that day is before the kickoff, or before the start without a kickoff.
- **Blocked has no week-ago value:** the console cannot rebuild who was blocked a week ago, so Blocked shows the oldest wait instead of a change.
- **Wait time:** a blocked bead has waited since the earliest `created_at` of its dependencies on open blockers, or since its `updated_at` when only its status says blocked.
- **Kickoff:** the changes and the burn-up start at the milestone's `metadata.kickoff`, else at its `start`.
- **Epic in the milestone on a day:** the last entry of `metadata.milestone_moves` on or before that day decides. An epic without moves belongs to its current parent since its `created_at`. A task that moves between epics is not tracked.
- **Points on a day:** the last entry of `metadata.points_history` on or before that day. An epic without history has its current points since its `created_at`. Unreadable metadata counts as no history.
- **Trend length:** the last 6 milestones whose start is on or before today.
- **Unassigned note:** shown when 20% or more of the scope's closed beads have no assignee.
- **Team headline:** unchanged for a milestone scope. For a period it reads "<n> members".
- **Status headline:** none for a period scope.
- **No page breadcrumb:** the Reports page has no breadcrumb today (REQ-UI-072 is for bead pages) and none is added; the section is named by the sidebar, the tab list and the document title. Bead pages opened from a report keep "Reports" as their remembered place (REQ-UI-073), now with the section's path.
- **Old links with a sprint:** `sprint` is dropped without a message. The bead filter's Sprint (REQ-UI-083) is not affected.
- **No new asset:** the confirmed preview board `reports` is the layout source. Its "Copy summary" and "Export" buttons belong to epic gin-console-rm-wbs-export, and its "AI usage" section is retired.
- **Deploy:** the report JSON shapes change, so the frontend must be rebuilt with the backend.

## Non-goals

- Copy summary and the WBS export (epic gin-console-rm-wbs-export).
- Reports across projects.
- A per-epic baseline stored at kickoff (would need gin-workflow).
- A custom from–to date range.
- Review cycles, rejections, findings and waivers (epic gin-console-rm-review-audit).
- Per-member trends: the trend is for the team only.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-rm-reports-status --against master` prints `ok`, and `gin specs trace --change gin-console-rm-reports-status` lists no missing REQ.
- The team points delivered of a closed milestone equal its `velocity.completed_points` from `gin milestone list`, and its accuracy equals `velocity.accuracy`, on the example project.
- `GET /api/reports/status` starts no process.
- TC-1 passes on the Tailscale build at 1440px and 390px:
  - the Status section of the example project's active milestone;
  - one scope across all five sections;
  - old `?tab=` links;
  - Team KPI v2.
