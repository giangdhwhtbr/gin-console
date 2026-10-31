# Milestones

Epic: gin-console-djg
Date: 2026-10-31

## Why
gin-workflow now groups roadmap epics into dated milestones (`gin-workflow milestone ...`, capability `milestones`, epic gin-workflow-6cji) and schedules them on working days. The PM decides when to kick a milestone off by comparing plans, but the only view of a milestone today is the text output of `gin-workflow milestone show`. gin-console is where the team already reads projects and Beads, so it should show milestones, their dependency graph, a Gantt of the schedule, and a read-only preview of other kick-start dates. This is the console half of cross-repo epic gin-harness-6s4; its input contract is `gin-harness/docs/changes/gin-harness-6s4-milestones` (REQ-MILESTONE-UI-001..007, JSON contract in its `design.md`).

Milestone beads also change what the existing Beads views show: a milestone is not work, so it must not count as ready, and it must not appear as a bead or as the parent of its epics.

## What Changes
1. **Milestones API**: a new `milestones` backend context runs `gin-workflow milestone list --all --json` and `gin-workflow milestone show <id> [--start <date>] --json` per project and serves them at `GET /api/milestones?project=<name>` and `GET /api/milestones/{project}/{id}?start=<date>`, accepting only `schema: 1` and naming the cause when milestones are unavailable.
2. **Milestones page**: a sidebar entry opens a per-project list of milestones with status, period, epic progress, warnings, and the count of roadmap epics not in any milestone.
3. **Milestone page**: a Gantt tab draws the schedule with today and end lines and per-epic warnings, with a Kick-start date picker for `planned` and `scheduled` milestones that redraws a read-only preview and shows the `kickstart` command; a Graph tab reuses the Dependencies graph scoped to the milestone.
4. **Beads views**: beads of type `milestone` are excluded from ready work (Projects page counts and active epics, `ready` flag) and hidden from the List, Board, Focus, and Dependencies views, so epics under a milestone show as top-level.

## User Stories

### US-1: See a project's milestones
As a PM, I want a Milestones page listing each milestone with its status, period, progress, and warnings, so that I can see where every milestone stands without running the CLI.
REQ: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008

Acceptance criteria:
- The sidebar has a Milestones entry that opens the list for the selected project.
- Each milestone shows title, status, start and end, kickoff when set, closed of total epics, and warning count.
- A milestone whose schedule cannot be computed shows its error in place of progress and warnings.
- The page shows how many roadmap epics are not in any milestone.

### US-2: Read a milestone's schedule
As a PM, I want a Gantt of the milestone's epics with today and end lines and warnings, so that I can spot overflow, late, unestimated, and externally blocked epics.
REQ: REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008

Acceptance criteria:
- Each epic is a bar from `planned_start` to `planned_end`, colored by bead status.
- A line marks `today` from the JSON and another marks the milestone `end`.
- An epic with warnings shows each one; `overflow` shows its number of days and `external_blocker` names the blocking bead and its milestone.

### US-3: Preview a kick-start date
As a PM, I want to pick a kick-start date and see the schedule it would give, so that I can choose the date before running `kickstart`.
REQ: REQ-MILESTONE-UI-004, REQ-MILESTONE-UI-008

Acceptance criteria:
- A `planned` or `scheduled` milestone's Gantt tab has a date picker defaulting to `kickoff`, else `start`.
- Picking a date redraws the Gantt from that date, labelled as a preview, with the command `gin-workflow milestone kickstart <id> --date <date>`.
- An `active` or `closed` milestone has no picker.
- A failed preview shows its error in the Gantt tab and never shows the previous plan as current.

### US-4: See dependencies inside a milestone
As a developer, I want a Graph tab with the milestone's epics and their dependencies, so that I can see the order of work and what outside the milestone blocks it.
REQ: REQ-MILESTONE-UI-002

Acceptance criteria:
- The milestone's epics are nodes with an edge for each dependency between them.
- A bead outside the milestone that an epic depends on is drawn as an external node.

### US-5: Understand why milestones are unavailable
As a console user, I want an error that names the cause and the fix when milestones cannot be read, so that I know whether to update gin-workflow or switch the project to Beads.
REQ: REQ-MILESTONE-UI-005, REQ-MILESTONE-UI-008

Acceptance criteria:
- A gin-workflow without the `milestone` command gives an error that says to run `gin-workflow/install.sh`.
- A `schema` other than 1 gives an error naming the unsupported schema.
- A project on markdown tracking gives an error that says milestones need `providers.task_tracking: beads`.

### US-6: Beads views ignore milestones
As a console user, I want milestone beads kept out of ready work and the Beads views, so that my boards and counts show only work.
REQ: REQ-MILESTONE-UI-006, REQ-MILESTONE-UI-007, REQ-MILESTONE-UI-009, REQ-BEADS-007, REQ-SERVER-006

Acceptance criteria:
- An open milestone without blockers is not counted as ready on the Projects page and has `ready` false in the bead list.
- No milestone bead appears in the List, Board, Focus, or Dependencies views.
- Epics under a milestone appear as top-level beads with their own dependency edges.

## Capabilities Affected
- `milestone-ui` (new): Milestones API, list page, milestone Graph and Gantt tabs, kick-start preview, error states, milestone beads in Beads views.
- `beads`: `ready` flag excludes milestones (REQ-BEADS-007).
- `server`: Projects summary `ready` count and active epics exclude milestones (REQ-SERVER-006).

## Non-goals
- Writing anything: create, update, kickstart, move, estimate, and close stay CLI-only; the console shows the command instead (read-only, ADR-0001).
- Any `milestone` JSON schema other than 1.
- Changing the bead detail page reached by a direct link to a milestone id.
- A chart or date library; the Gantt is built with the existing stack.
- Re-forecasting from actual start or close dates; the console draws the plan gin-workflow computes.

## Success Criteria
- Every scenario of REQ-MILESTONE-UI-001..009 and of the modified REQ-BEADS-007 and REQ-SERVER-006 has a test naming its REQ-ID.
- Against a real project with a planned milestone, the Milestones list, Gantt, preview, and Graph match `gin-workflow milestone list|show --json` for the same project.
- `uv run --directory backend pytest`, ruff, mypy, `pnpm -C frontend test --run`, typecheck, lint, and build pass.
