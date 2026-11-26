# Project timeline

Epic: gin-console-rm-project-timeline
Kind: capability
Points: 5 (4 stories, 6 new and 2 modified REQs: one view with a new calendar axis and three zooms over the chained forecast, closed history from Beads, the project finish in the header; backend keeps fields it drops today; unchanged from the roadmap)
Date: 2026-11-26

## Why

A PM who asks "when does all of it finish, and which milestone pushes it out?" has to open each milestone's Gantt in turn, and the epics outside any milestone are on no time axis at all. Each Gantt starts its own milestone at its kickoff, so a late milestone never shows how it pushes the next one.

Goal and scope after the epic's comments: See every milestone and epic of a project on one time axis with the project finish. Navigation shell shipped (merge `2ca8410`, 2026-11-21): the Milestones page keeps the sidebar and the project in the URL. The gin-workflow capability `milestone-chained-forecast` (gin-workflow-6yoq) shipped on 2026-11-22: `gin milestone list --all --json` (gin 3.5.3) returns `forecast.milestones` (chained `start`, `finish`, `overflow_days` per open milestone) and `forecast.epics` (`title`, `status`, `milestone`, `lane`, `planned_start`, `planned_end`, `remaining_days`, `estimate_source`, `warnings`), so the decision of 2026-11-21 (no stitched interim) no longer blocks the epic.

Comments considered: 1, latest 2026-11-21T16:00:28Z

Facts found on 2026-11-26:
- The console drops `forecast.milestones` and, per forecast epic, `title`, `status`, `lane`, `remaining_days` and `warnings` (`milestones/models.py:57-77`).
- The milestone Gantt (`features/milestones/GanttChart.tsx`) is hand-drawn DOM and CSS with one column per day, narrow weekends and the zooms `1w`, `2w` and `all`; its axis is built from one milestone's detail.
- gin-console: 4 milestones (1 open), 5 open epics (3 outside a milestone), from 2026-11-23 to 2027-01-28, finish 2027-01-19. gin-workflow: 3 closed milestones, 13 open epics all outside a milestone, deadline 2026-12-11, finish 2026-12-22, 7 working days late. example: 6 milestones (3 open), 17 open epics over almost a year. qwikfone: `gin milestone list` fails today (bd refuses a schema migration).
- The forecast holds open milestones and open epics only; closed work has only its real dates in Beads.

User decisions 2026-11-26:
- **Closed work:** shown as history behind "Show closed" (`closed=1`), off by default.
- **Default view:** Timeline; `view=list` opens today's list.
- **Architecture:** `/api/milestones` keeps the forecast fields and adds the dates of closed epics from the Beads snapshot it already reads; a new view draws a calendar axis and reuses the Gantt's panning, label column and today chip, leaving the milestone Gantt unchanged.

Assumptions (defaults taken without a question):
- One day is 24px wide in Weeks, 6px in Months and 2px in Quarters; Months is the default zoom.
- Rows: closed milestones by `start`, then open milestones in the chain order of `forecast.milestones`, then milestones not in the chain by `start`, then "Not in a milestone"; one row per epic, the lane shown as a number.
- Closed epics on the timeline are the closed epics labelled `roadmap` (the epics the forecast counts); a closed epic without `started_at` starts on the date of its `created_at`.
- The axis spans the earliest shown item to the latest of the shown items' ends, the forecast `finish` and the deadline; it opens scrolled so that today sits near the left edge.

## What Changes

- **Backend:** `/api/milestones` returns `forecast.milestones`, the full forecast epic rows, and `closed_epics`.
- **Milestones page:** Timeline and List views; the project finish, deadline and lateness in the header of both.
- **Timeline:** milestone rows with their window and forecast overrun, their epic rows, the epics outside a milestone, Weeks / Months / Quarters, today and deadline lines, "Show closed".

## User Stories

### US-1: See when the project finishes
As a PM, I want the project's forecast finish and its lateness against the deadline at the top of the Milestones page, so that I answer "when is it done" without reading every milestone.
REQ: REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-034

Acceptance criteria:
- The header reads "Project finishes <date>", with "deadline <date>" when there is one and "<n> working days late" with a warning icon when the forecast overflows it.
- The header has no finish line when there is no forecast, and the forecast error when it failed.

### US-2: See milestones and epics on one axis
As a PM, I want every open milestone and epic of a project on one time axis, so that I see which milestone runs late and what it pushes.
REQ: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-033, REQ-MILESTONE-UI-035, REQ-MILESTONE-UI-036

Acceptance criteria:
- The Milestones page opens on the Timeline, and List shows today's list.
- Each open milestone shows its window and, hatched, the forecast part past its end, followed by its epics with their planned bars; the epics outside a milestone come last.
- Weeks, Months and Quarters change the scale; today and the deadline are lines on the axis.

### US-3: Look back at finished milestones
As a lead, I want to show the finished milestones and epics with their real dates, so that I compare the plan with what happened.
REQ: REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-037

Acceptance criteria:
- "Show closed" adds the closed milestones and their closed epics with their real dates, styled as done, and keeps `closed=1` in the URL.

### US-4: Understand gaps in the forecast
As a PM, I want the timeline to say when the forecast is missing, failed or assumed, so that I do not read a gap as a date.
REQ: REQ-MILESTONE-UI-038

Acceptance criteria:
- No forecast, a forecast error, a milestone without open epics, an assumed estimate and unreadable closed epics each have their own text or style.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `milestone-ui` | `REQ-MILESTONE-UI-033`, `REQ-MILESTONE-UI-034`, `REQ-MILESTONE-UI-035`, `REQ-MILESTONE-UI-036`, `REQ-MILESTONE-UI-037`, `REQ-MILESTONE-UI-038`; modified `REQ-MILESTONE-UI-001`, `REQ-MILESTONE-UI-008` | `docs/specs/milestone-ui/diagrams/project-timeline-activity.md`, `docs/specs/milestone-ui/use-cases/see-project-timeline.md` |

## Non-goals

- Every project on one timeline.
- Dependency arrows, dragging bars to change dates, exporting the timeline as an image.
- Any change to the milestone page's Gantt.

## Success Criteria

- For gin-workflow, the Timeline shows 13 epics under "Not in a milestone" and the header reads "Project finishes 22 Dec", "deadline 11 Dec" and "7 working days late".
- For example, Quarters fits almost a year in the window, and "Show closed" adds ex-m0a, ex-m0b and ex-m1.
- `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-project-timeline` prints `ok`.
