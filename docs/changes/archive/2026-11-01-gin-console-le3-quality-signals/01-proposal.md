# Quality signals

Epic: gin-console-le3
Date: 2026-11-01

## Why
A PM reading a bead cannot see whether it was closed too early and reopened, or which bugs were found from it. gin-workflow writes these counts into `metadata.ai_usage.quality` only when `gin-workflow usage collect` runs at close, which covers 6 of the 96 beads of gin-console, and never an open bead. Decision 2026-10-23 (gin-workflow-3dfx, superseded): the console computes them itself, read-only.

## What Changes
1. **Bugs found**: the bead detail API returns `bugs`, the beads of type `bug` that have a `discovered-from` dependency on the bead, open and closed. The bead page lists them under "Bugs found". The data comes from the `bd dep list --direction up` call the detail already runs, so no command is added.
2. **Reopens**: a new endpoint `GET /api/beads/{project}/{id}/reopens` counts how often the bead went from `closed` to another status in `bd history`. The bead page loads it after the bead is shown and says "Reopened N times" when N is above 0. A result is kept in memory while the bead's `updated_at` is unchanged, because `bd history` takes about 0.4 s per bead.
3. Both counts follow gin-workflow's rules in `quality()` (`workflow_core/usage.py`), so the console and `gin-workflow report` agree.

## User Stories

### US-1: See the bugs found from a bead
As a PM, I want the bead page to list the bugs found from the bead, so that I can judge the quality of finished work without running `bd dep list`.
REQ: REQ-BEADS-002, REQ-UI-086

Acceptance criteria:
- The bead page lists under "Bugs found" each bug with a `discovered-from` dependency on the bead, open or closed, with its id, title and status, linking to its bead page.
- A bead with a `discovered-from` dependent that is not a bug does not list it.
- Without such bugs the section is not shown.

### US-2: See how often a bead was reopened
As a PM, I want the bead page to say how often the bead was reopened, so that I can spot work that was closed before it was done.
REQ: REQ-BEADS-011, REQ-UI-086

Acceptance criteria:
- A bead reopened twice shows "Reopened 2 times"; once shows "Reopened 1 time".
- A bead never reopened shows nothing about reopens.
- While the count loads, or when it failed, the page never shows 0.
- If the count cannot be loaded, the page shows the error with a Retry button and the rest of the page stays shown.
- Opening the same unchanged bead again does not run `bd history` again.

## Capabilities Affected
- `beads`: REQ-BEADS-002 modified (adds `bugs`), REQ-BEADS-011 added (reopens endpoint).
- `ui`: REQ-UI-086 added (bugs and reopens on the bead page and the List detail panel, which shows the same content).

## Non-goals
- Bug or reopen counts on Board, Focus and Tree cards or List rows: `bd history` costs about 0.4 s per bead, and the list holds open beads only, so card counts need a background task and a closed-bead list. Decided 2026-11-01 (user): bead page only.
- A background task, a daily schedule, a Refresh control, or a cache on disk.
- Review cycles, rejections, waivers and findings: they need the review ledger and the event file, which are off in this repo.
- Reading `metadata.ai_usage.quality` as a shortcut.
- Writing any count back to Beads (the console is read-only).

## Success Criteria
- On gin-console, the page of `gin-console-djg` lists no bug (its only `discovered-from` dependent, `gin-console-l69`, is an epic), and a bead whose `bd history` shows a `closed` to `open` change shows its reopen count.
- Vitest and pytest cases carry REQ-BEADS-002, REQ-BEADS-011 and REQ-UI-086.
