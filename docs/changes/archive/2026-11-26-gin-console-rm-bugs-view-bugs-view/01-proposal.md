# Bugs view

Epic: gin-console-rm-bugs-view
Kind: capability
Points: 3 (3 stories, 6 new REQs and 4 modified; 1 endpoint over data already read and 1 report section built from existing parts; smaller than gin-console-rm-wbs-export = 5)
Date: 2026-11-25

## Why

A PM or a QA cannot see where the bugs of a project come from, how long they stay open, or whether more are opened than closed each week. Reports shows a bug only as rework of a closed bead (the `discovered-from` count of REQ-REPORTS-019), so a bug without that link is in no report, and the age of an open bug is on no page but the Team bead list.

Goal and scope after the epic's comments: See where bugs come from and how long they stay open. One set of definitions shipped (gin-console-rm-definitions, merge `8a13790`): done is closed everywhere, one person is one identity, and rework is counted by REQ-REPORTS-019. The Bugs section reuses them and says in its tooltips how its numbers differ from "Bugs found later".

Comments considered: 1, latest 2026-11-22T06:59:31Z

Facts measured on 2026-11-25 (300 bugs: gin-console 17, gin-workflow 113, qwikfone 170):
- 57 (19%) have a `discovered-from` link; 113 (38%) reach an epic by that link or by their parents, so 62% have an unknown source.
- 18 (6%) reach a capability.
- 1 can be told apart as found by QA: gin-qa sets no label on the bugs it files.
- 25 are open, all in qwikfone, 3 to 43 days old; elsewhere the median bug closes within a day.

User decisions 2026-11-25:
- **Scope:** three parts: bugs by source epic with "Source unknown", age of open bugs, and opened and closed bugs per week. The split by capability (6% of the bugs) and "found by QA versus found later" (1 bug) are dropped.
- **Place:** a Bugs section in Reports, in the capability `reports`. No `qa` capability and no new link in the main navigation.
- **Counting:** a bug counts by the dates it was created and closed, inside the period of the selected scope. The open bugs are those of today, whatever the scope.
- **Architecture:** one endpoint, `GET /api/reports/bugs`.

Assumptions (defaults taken without a question):
- The source epic comes from the first `discovered-from` target, by id, that reaches an epic. A bug discovered from another bug takes the epic of that bug's parents; a chain of bugs is not followed further.
- Ages and times are calendar days of the server's local date.
- A deferred bug counts as open.
- A bug whose row lacks a valid `created_at` is left out, as in every report (REQ-BEADS-005).
- The scope names a time span: for a milestone, the bugs of its dates, not the bugs of its epics.

Risk: gin-console-rm-requirements, in progress in another session, also modifies REQ-UI-063. The epic that ships second rewrites its MODIFIED block on the new text (`gin specs lint` names the stale one).

The roadmap entry and the epic description still name the dropped parts and the capability `qa`; the plan updates the roadmap entry.

## What Changes

- **Backend**: `GET /api/reports/bugs` returns the bug figures, weeks, epic rows and open bugs of one project for a milestone or a period.
- **Bugs section** (`/reports/bugs`): figures, opened and closed bugs per week, bugs by epic, and the open bugs, oldest first.
- **Reports**: the sections become six, with Bugs after Rework, its headline "<n> open bugs", its page title and its place in the sidebar.

## User Stories

### US-1: See where bugs come from
As a PM, I want the bugs of a milestone or period by source epic, so that I see which work caused them.
REQ: REQ-REPORTS-033, REQ-REPORTS-039, REQ-REPORTS-040, REQ-REPORTS-042, REQ-REPORTS-043, REQ-UI-063, REQ-UI-095, REQ-UI-129

Acceptance criteria:
- `/reports/bugs` lists each source epic with its bugs opened and closed in the scope and its bugs open now, and "Source unknown" last.
- A bug counts for the epic its `discovered-from` link reaches, else for the epic among its parents, else for "Source unknown".
- The section says which share of the bugs opened in the scope has no source epic.
- Choosing another milestone or period changes the counts and keeps the section.

### US-2: See how long bugs stay open
As a QA, I want the open bugs with their age, oldest first, so that I raise the ones that were forgotten.
REQ: REQ-REPORTS-041, REQ-REPORTS-042, REQ-REPORTS-043, REQ-REPORTS-044

Acceptance criteria:
- The open bugs of the project show oldest first with priority, assignee, age and source epic, whatever the scope.
- The figures show the bugs open now, the age of the oldest and the median days to close.
- The Reports navigation shows the number of open bugs as the headline of Bugs.

### US-3: See whether bugs pile up
As a PM, I want the bugs opened and closed per week, so that I see whether the team keeps up.
REQ: REQ-REPORTS-041, REQ-REPORTS-043

Acceptance criteria:
- Each week of the scope shows its opened and closed bugs, weeks without bugs included.
- The weeks add up to the Opened and Closed figures.

## Capabilities Affected

| Capability | REQs | Assets / Diagrams / Use Cases |
|---|---|---|
| `reports` | `REQ-REPORTS-039`, `REQ-REPORTS-040`, `REQ-REPORTS-041`, `REQ-REPORTS-042`, `REQ-REPORTS-043`, `REQ-REPORTS-044`; modified `REQ-REPORTS-033` | `docs/specs/reports/diagrams/bugs-section-activity.md`, `docs/specs/reports/use-cases/see-where-bugs-come-from.md` |
| `ui` | modified `REQ-UI-063`, `REQ-UI-095`, `REQ-UI-129` | none |

## Non-goals

- Bugs by capability, and bugs found by QA versus found later.
- Filing, editing or closing bugs.
- Several projects in one report, and CSV export.
- Any change to the rework rules (REQ-REPORTS-019), to the Rework section, or to `/api/beads`.

## Success Criteria

- For a project with linked, parented and unlinked bugs, the epic rows hold the counts of REQ-REPORTS-042 and the sum of their open bugs is the Open now figure.
- The weeks add up to Opened and Closed for a milestone and for each period.
- A project without bugs, a milestone that has not started, and an unreadable export each show the state REQ-REPORTS-044 names.
- `/reports/bugs` has no horizontal page scroll at 390px.
- `pytest`, `ruff`, `mypy`, `vitest`, `typecheck`, `lint` and `build` pass with each REQ named in a test, and `gin-qa cases check --change gin-console-rm-bugs-view` prints `ok`.
