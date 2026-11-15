# Project card health from gin state

Epic: gin-console-5ox
Kind: capability
Date: 2026-11-15

## Why

`gin state --format json` reports a project's workspace repos, team mode, `decision`, `warnings`, `remedies` and `review_waivers`. gin-console reads only `stage`, `layout` and `gates` of the default workflow (`projects/collect.py`). That default workflow is rarely the one in use: each epic records its gates under its own `--workflow-id`. So a project with shipped and in-progress epics shows every gate `unmet`. gin-console looks stuck, and qwikfone's 8 workspace repos are invisible.

This epic was split from gin-console-workflow-catchup by its 2026-11-15 audit.

## What Changes

- The `workflow` block of `GET /api/projects` adds `workspace`, `team`, `decision`, `warnings`, `remedies` and `review_waivers` from the default `gin state`.
- Each active epic in `beads.epics` gains `status`. In `GET /api/projects` only, an in-progress epic also gains `workflow` from `gin state --workflow-id <epic>`:
  - it holds `stage`, `gates`, `warnings` and `review_waivers`, or an error;
  - these commands run at most four at a time and are cached with the response.
- On the project card:
  - The default-workflow stage and gate chips go away.
  - Each epic in progress shows its stage, with a warning mark when it has warnings or review waivers. A ready epic shows "ready".
  - The card shows "workspace · <n> repos" with a repo list, "team · <host>", a health alert for `hold`, warnings and remedies, and the project's review waivers.

## User Stories

### US-1: See where each epic stands
As a team member, I want each epic in progress on the project card to show its lifecycle stage, so that I can see at a glance which epics are in plan, execute or ship.
REQ: REQ-SERVER-006, REQ-UI-004

Acceptance criteria:
- An epic in progress at `execute` shows "execute". A ready epic shows "ready".
- An epic with a review waiver shows a warning mark "1", with the waiver in its details.
- When one epic's `gin state` fails, that epic shows "stage unknown" and the rest of the card is unchanged.
- `GET /api/projects/beads` starts no process and carries no epic `workflow`.

### US-2: See the project's workspace, team and health
As a team lead, I want the project card to show the workspace repos, team mode, and anything that holds the workflow back, so that a project-level problem is visible without running `gin state`.
REQ: REQ-SERVER-005, REQ-UI-003

Acceptance criteria:
- qwikfone shows "workspace · 8 repos". "Show repos" lists each repo's path, branch and shape, and marks frozen or missing repos.
- A team-mode project shows "team · <host>".
- `decision` `hold`, warnings and remedies show in an alert, and review waivers are listed with task, reason and actor.
- A project without these shows none of them and no default-workflow gate chips.

## Capabilities Affected

- `server`: MODIFIED REQ-SERVER-005, REQ-SERVER-006.
  - Diagram: `docs/specs/server/diagrams/project-health-activity.md`.
- `ui`: MODIFIED REQ-UI-003, REQ-UI-004.
- Assets: none.

## Non-goals

- Team members, areas and approvals, which `gin state` does not report. That would need a gin-harness epic.
- A project detail page.
- Running `gin state` for ready or closed epics.
- Any change to gin-workflow.

## Success Criteria

- Every scenario of the MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console with qwikfone and gin-console, checked by Playwright with screenshots.
