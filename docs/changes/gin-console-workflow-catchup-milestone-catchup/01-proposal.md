# Milestone catch-up with gin-workflow

Epic: gin-console-workflow-catchup
Kind: capability
Date: 2026-11-15

## Why

gin-workflow 3.1.1 records a milestone's outcome as bead comments: `[gin retro]` from `/retro` and `[gin close]` from `/milestone-close`. Its milestone JSON also carries `integration`, `deadline`, `away`, `remaining_days`, `assumed_days`, and the warnings `spec_due`, `after_integration`, `open_bugs` and `oversized`. gin-console shows the comments only as raw text on the bead page, drops those fields, and prints the newer warning codes raw on the Gantt. For example, `spec_due` is visible today in qwikfone. The Team tab also still offers `gin-workflow milestone create`, a command that no longer exists.

The audit of 2026-11-15 split the original catch-up epic into three. This change covers the milestone part. gin-console-it2 covers epic kind and capabilities, and gin-console-5ox covers the project card.

Confirmed summary:
- The audit compared `gin state`, `gin milestone list/show` and `bd` JSON with the console.
- The milestone gaps are the retro and close comments, the four warning codes, `integration`/`deadline`/`away`, and `remaining_days`/`assumed_days`.
- The related epics are agw, mbi and cl0 in the console, and sprint-retro, milestone-close and legacy-inventory in gin-workflow. All have shipped.
- gin-workflow names the console as the reader of the retro and close comment contract.

## What Changes

- **Retro tab.** The milestone page gains a third tab, Retro (`tab=retro`). It shows the newest `[gin close]` comment, split by its labels, and the newest `[gin retro]` of each member, split by `Went well:`, `Slowed us:` and `Change next:`. Comments are read through the existing comments API.
- **Gantt warnings.** The Gantt reads `spec_due`, `after_integration`, `open_bugs` and `oversized` as sentences.
- **Milestone header.** The header shows "Integration <date>", "Deadline <date>" and "Away: …".
- **Gantt estimates.** The Gantt shows "<n>d left" for an in-progress epic, and "assumed <n>d" for an unestimated one.
- **Milestones API.** The API passes `integration`, `deadline`, `away`, `remaining_days` and `assumed_days` through.
- **Team tab.** The empty state offers `gin milestone create`.

## User Stories

### US-1: Read a milestone's outcome
As a team lead, I want the milestone page to show the close summary and each member's latest retro, so that I can review what was delivered and what to change without reading raw comments.
REQ: REQ-MILESTONE-UI-019, REQ-MILESTONE-UI-018

Acceptance criteria:
- A milestone with a close comment and two retros shows "Retro 2". The tab shows the close block with each label it holds, then the retros by member, newest only.
- A comment with a prefix but no known label shows in full with "Not in the expected format".
- A milestone without retro or close comments says "No retros yet. Members record one with `/retro`."

### US-2: Up-to-date schedule facts and warnings
As a team member, I want the milestone page to show the integration date, the deadline, members away, remaining and assumed days, and every warning as a sentence, so that the plan reads the same as `gin milestone show`.
REQ: REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-020

Acceptance criteria:
- `spec_due`, `after_integration`, `open_bugs` and `oversized` read as sentences on the Gantt.
- The header shows "Integration 24 Nov", "Deadline 28 Nov" and "Away: ann 18–20 Nov" when the JSON has them, and nothing when it does not.
- An in-progress epic with 2 of 5 days remaining reads "2d left". An unestimated epic with `assumed_days: 3` reads "assumed 3d".

### US-3: Current command on the Team tab
As a team lead with no milestones yet, I want the Team tab to offer the command that exists today, so that copying it works.
REQ: REQ-REPORTS-017

Acceptance criteria:
- The empty Team tab offers `gin milestone create`.

## Capabilities Affected

- `milestone-ui`:
  - ADDED REQ-MILESTONE-UI-019 and REQ-MILESTONE-UI-020.
  - MODIFIED REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-013 and REQ-MILESTONE-UI-018.
  - Diagram: `docs/specs/milestone-ui/diagrams/milestone-retro-activity.md`.
- `reports`: MODIFIED REQ-REPORTS-017.
- Assets: none.

## Non-goals

- A Metrics trend chart. The `Metrics:` line is shown as text.
- Writing retros or closing milestones from the console, which stays read-only.
- Epic kind, capabilities and the project card, which belong to gin-console-it2 and gin-console-5ox.
- Any change to gin-workflow.

## Success Criteria

- Every scenario of the ADDED and MODIFIED requirements has an automated test that carries its REQ-ID.
- TC-1 passes on the deployed console with an example project that holds retro and close comments, checked by Playwright with screenshots.
