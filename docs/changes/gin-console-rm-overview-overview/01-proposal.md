# Overview for leads

Epic: gin-console-rm-overview
Kind: capability
Points: 8 (1 new home page with 5 attention lists, milestone verdicts and workload, 1 new endpoint, 1 config key, navigation changes; medium: gin gate load)
Date: 2026-11-25

## Why

A lead has no cross-project view, and blockers are buried in each project (team lead walkthrough, 2026-11-21). The Overview answers one question across every project each morning: what needs me now.

Confirmed summary, 2026-11-24: the page holds Needs attention (blocked work with its blocker and the blocker's assignee, work in progress too long, gates, waivers, unassigned ready work), one milestone verdict per project, and work in progress per member. Notifications are out of scope and the console stays read-only. gin-console-rm-definitions has shipped, so the page reuses its rules for blocked, done, assignee and person. gin-console-k4l removed the Projects page and the gin state fan-out; gates are still readable per epic.

Comments considered: 1, latest 2026-11-22T06:59:28Z

Design decisions, 2026-11-25:
- gin has no "failing" gate. The list shows in-progress epics with an entry gate unmet or any gate unknown.
- The backend owns the bead lists in a new `overview` context (approach A). A frontend fan-out would duplicate the rules, and a scheduled gin refresh would run gin while nobody looks.

## What Changes

- `GET /api/overview`: the lists of every project from snapshots, with no process started.
- An Overview page at `/`, first in the Main navigation. `/` no longer redirects to My Tasks.
- Milestone verdicts, and gates and waivers, load after the lists from endpoints that exist.
- `overview.aging_days` in the config.
- Overview becomes a remembered place for bead pages, whatever their project.

## User Stories

### US-1: See what needs me
As a team lead, I want blocked, aging and unassigned work of every project on one page, so that I know each morning where to step in.
REQ: REQ-OVERVIEW-001, REQ-OVERVIEW-002, REQ-OVERVIEW-003, REQ-OVERVIEW-004, REQ-OVERVIEW-009, REQ-CONFIG-007

Acceptance criteria:
- A blocked bead of any project shows its wait, its blocker and the blocker's assignee.
- A bead in progress for more than 3 working days, or the configured number, is listed.
- A ready bead with an owner and no assignee is listed as unassigned.

### US-2: Spot broken process
As a team lead, I want epics started before their gates, and waivers on running epics, so that I can ask about them.
REQ: REQ-OVERVIEW-008

Acceptance criteria:
- An in-progress epic with `plan_approved` unmet is listed; one that only awaits `shipped` is not.
- A gate waiver and a review waiver are listed with their reasons.

### US-3: One verdict per project
As a team lead, I want one milestone verdict per project, so that I see which project is slipping.
REQ: REQ-OVERVIEW-006, REQ-OVERVIEW-007, REQ-MILESTONE-UI-023

Acceptance criteria:
- An overdue milestone that was never kicked off reads "Late".
- A project with only closed milestones reads "No open milestone".

### US-4: Workload per member
As a team lead, I want each member's work in progress across projects, so that I can see who is overloaded.
REQ: REQ-OVERVIEW-005, REQ-BEADS-023

Acceptance criteria:
- A handle and its email in two projects make one row with a number per project.

### US-5: Start and return here
As a team lead, I want the Overview as the home page and as the way back from a bead, so that I can work through the lists.
REQ: REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-099, REQ-UI-123

Acceptance criteria:
- `/` shows the Overview, and "Overview" is the first link of the Main navigation.
- A bead of any project opened from the Overview returns to it by the breadcrumb.

### US-6: Trust a partial page
As a team lead, I want a project or gin failure shown beside the rest, so that one broken project never hides the others.
REQ: REQ-OVERVIEW-001, REQ-OVERVIEW-010, REQ-OVERVIEW-011

Acceptance criteria:
- With one project unreadable, the lists hold the beads of the others and an alert names it.
- At 360px the page does not scroll sideways.

## Capabilities Affected

- `overview` (new):
  - ADDED: REQ-OVERVIEW-001 to REQ-OVERVIEW-011.
  - Diagrams: `docs/specs/overview/diagrams/overview-page-activity.md`.
  - Use cases: `docs/specs/overview/use-cases/review-what-needs-me.md`.
- `ui`: MODIFIED REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-073, REQ-UI-099, REQ-UI-123.
- `config`: ADDED REQ-CONFIG-007. Diagram: `docs/specs/config/diagrams/overview-settings-activity.md`.
- `beads`: MODIFIED REQ-BEADS-023.
- `milestone-ui`: MODIFIED REQ-MILESTONE-UI-023.
- Assets: none.

The epic lists `ui, beads`. The feature gets its own capability because `ui` holds only the design system, layout, navigation and shared components.

## Assumptions

- **Open waiver:** gin never closes a waiver, so every waiver on an in-progress epic is shown.
- **Local gates:** gate history lives in each machine's gin logs, so another machine may show other gates.
- **Started:** whether `started_at` restarts when a bead is reopened was not checked; days count from the recorded value.
- **Every project counts**, the demo project `example` included.
- **Blocked list:** it follows REQ-BEADS-021, so a blocked epic and its children are each listed.
- **Workload has no capacity:** the console knows none.
- **gin-console-rm-review-audit** also mentions gate events in the overview; its history views stay in that epic.

## Non-goals

- Notifications, and any control that changes a project.
- Gates of ready epics, and gate history.
- Filtering the Overview by project or person.
- A scheduled gin refresh.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-rm-overview --against master` prints `ok`, and `gin specs trace --change gin-console-rm-overview` lists no missing REQ.
- `GET /api/overview` starts no process.
- TC-1 passes on the Tailscale build.
