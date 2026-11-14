# Prep tasks

Epic: gin-console-agw
Kind: capability
Date: 2026-11-13

## Why

gin-workflow epic gin-workflow-y4o8 added prep tasks. A prep task is a child of an epic labelled `prep` and `prep:<type>`, such as a legacy capture or a mockup, made before discuss. gin-workflow keeps prep tasks out of an epic's tracks (`workflow_core/prep.py` `is_prep`). gin-console still shows them as ordinary children. Its epic progress, its open and ready counts, and its reports therefore mix pre-discuss work with tracks.

## What Changes

- A bead is a prep task when its `labels` hold `prep` and no label starts with `track:` or `req:`. The other children of an epic are its tracks.
- `GET /api/projects` and `GET /api/projects/beads` leave prep tasks out of `open`, `in_progress`, `blocked` and `ready`, and add `prep`, the number of prep tasks that are not closed.
- The bead detail adds `prep` to each entry of `children`.
- The AI usage report counts an epic's closed and total tracks in `closed_children` and `children`, and adds `closed_prep_children` and `prep_children`. Prep tasks still count toward the epic's tokens and cost.
- The Team tab leaves prep tasks out of its scope. An epic whose only children are prep tasks counts as an epic not yet split into tasks.
- Epic progress on the List view, the bead page, the Dependencies page and the Gantt counts tracks only. Where an epic has prep tasks, the List view, the bead page and the Gantt add "Prep x/y". A prep task shows a "Prep" chip in the List view, the bead page's children list, the Dependencies page and the Gantt.
- The AI usage tab shows "Prep x/y" on a top epic with prep tasks.
- A project card on the Projects page shows "prep <n>" when `prep` is above 0, in the same form as "open <n>".

## User Stories

### US-1: Epic progress counts tracks only
As a team member, I want an epic's progress to count only its tracks and to show its prep tasks apart, so that pre-discuss work does not make an epic look further along or further behind than its tracks are.
REQ: REQ-BEADS-002, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-075, REQ-MILESTONE-UI-015

Acceptance criteria:
- An epic with 1 of 2 tracks closed and 1 closed prep task reads 1 of 2 on the List view, the bead page, the Dependencies page and the Gantt.
- The List view, the bead page and the Gantt show "Prep 1/1" for that epic.
- The prep task shows a "Prep" chip wherever it is listed or drawn.
- A child labelled `prep` and `track:<name>` counts as a track and has no "Prep" chip.

### US-2: Project counts and reports leave prep tasks out
As a team lead, I want the project counts and the reports to leave prep tasks out of the work counts, so that ready work, team scope and epic child counts reflect tracks only.
REQ: REQ-SERVER-006, REQ-UI-004, REQ-REPORTS-003, REQ-REPORTS-009, REQ-UI-089

Acceptance criteria:
- A project with 2 open ready tracks and 1 open prep task shows 2 open and 2 ready, and "prep 1" on its card.
- A project with no open prep task shows no prep count on its card.
- An epic row of the AI usage report counts its tracks in `children` and its prep tasks in `prep_children`, and its tokens still include its prep tasks.
- The Team tab of a milestone holds no prep task, and holds an epic whose only children are prep tasks.

## Capabilities Affected

- `server`: MODIFIED REQ-SERVER-006. REQ-SERVER-010 refers to the REQ-SERVER-006 summary and keeps its text.
- `beads`: MODIFIED REQ-BEADS-002, which defines a prep task and a track.
- `reports`: MODIFIED REQ-REPORTS-003, REQ-REPORTS-009.
  - Diagram: `docs/specs/reports/diagrams/team-tab-activity.md`. Its scope step now says "except prep tasks and epics that have tracks", a one-line edit made in this change.
- `ui`: MODIFIED REQ-UI-004, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-075, REQ-UI-089.
- `milestone-ui`: MODIFIED REQ-MILESTONE-UI-015.
- Assets: none.

## Non-goals

- Changing the Board, Focus or My Tasks views.
- Changing usage accounting: own shares, epic tokens and costs stay as they are.
- Changing the milestone list's epic progress, which comes from `gin-workflow milestone` output.
- Creating, labelling or closing prep tasks. The console stays read-only.

## Assumptions

- The prep rule mirrors gin-workflow `workflow_core/prep.py` `is_prep`. It is kept in one backend helper and one frontend helper.
- A bead labelled `prep` that also has a `track:` or `req:` label is a track.
- The rule looks at labels only. A prep task is a prep task whatever its type, status or parent.
- An epic with prep tasks and no track shows no track count, only "Prep x/y".
- Usage is unchanged: gin-workflow counts prep cost toward the epic, which matches the own share of REQ-REPORTS-002.

## Success Criteria

- Every new scenario of the MODIFIED REQs has a test naming its REQ.
- `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- On the Tailscale deploy, an epic with a prep task shows its progress and prep count as described, and the project card leaves prep out and shows its prep count (TC-1).
