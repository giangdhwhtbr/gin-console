# Unassigned epics

Epic: gin-console-l69
Date: 2026-10-31

## Why
The browser check of gin-console-djg (TC-1, 2026-10-31) found that the Milestones page only says how many roadmap epics are in no milestone, from gin-workflow's `unassigned_epics`. The PM then has to leave the page to find which epics those are, and the count leaves out epics without the `roadmap` label, which also need a milestone before they can be scheduled.

## What Changes
1. **Epics not in a milestone**: below the milestones, the Milestones page lists every epic of the project that has no parent, with its state, id, title linked to the bead page, priority, and labels. The section heading carries the number of listed epics.
2. **Show closed**: the section lists open epics by default; a "Show closed" checkbox adds closed epics, shown dimmed.
3. **Count sentence removed**: the sentence "N roadmap epics aren't in a milestone yet" built from `unassigned_epics` is replaced by the section. The Milestones API still returns `unassigned_epics` unchanged (REQ-MILESTONE-UI-008).

The list comes from the beads the console already loads (`GET /api/beads`), not from gin-workflow, so no gin-workflow change or new endpoint is needed.

## User Stories

### US-1: See which epics are not in a milestone
As a PM, I want the Milestones page to list each epic that is not in a milestone, with a link to it, so that I can decide where to put it without leaving the page or running the CLI.
REQ: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-010

Acceptance criteria:
- Below the milestones, a section "Epics not in a milestone" lists each open epic of the project that has no parent, whether or not it has the `roadmap` label.
- An epic whose parent is a milestone, or any other bead, is not listed.
- Each row shows the epic's state, id, title linked to `/beads/<project>/<id>`, priority, and labels.
- The heading shows the number of listed rows, and that number always equals the rows shown.
- With no such epic, the section says every epic is in a milestone.
- The page no longer shows the sentence built from `unassigned_epics`.

### US-2: Include closed epics on demand
As a PM, I want to show closed epics that were never in a milestone, so that I can check finished work that bypassed milestones.
REQ: REQ-MILESTONE-UI-010

Acceptance criteria:
- The section has a "Show closed" checkbox, off by default.
- When it is on, closed epics without a parent are listed too, dimmed, and the count includes them.

### US-3: Epic list failure does not hide milestones
As a PM, I want a failure to load epics to stay inside the section, so that the milestones above remain usable.
REQ: REQ-MILESTONE-UI-010

Acceptance criteria:
- If the beads request fails, the section shows the error and a Retry button; the milestone list above is unchanged.

## Capabilities Affected
- `milestone-ui`: REQ-MILESTONE-UI-001 modified (drops the `unassigned_epics` sentence), REQ-MILESTONE-UI-010 added.

## Non-goals
- Changing gin-workflow's `unassigned_epics` or the `milestone list` JSON.
- A new backend endpoint; the section reuses `GET /api/beads`.
- Assigning an epic to a milestone from the console (read-only; the section shows the `/roadmap --milestone <id>` hint instead).
- Listing child epics of other epics: they follow their parent epic.

## Success Criteria
- On a project with open epics without a parent, the Milestones page lists exactly those epics, and the heading count equals the row count.
- `MilestonesPage.test.tsx` covers REQ-MILESTONE-UI-001 and REQ-MILESTONE-UI-010 scenarios.
