# Export a WBS

Actor: PM
Trigger: The PM needs a work breakdown of a milestone or a whole project for stakeholder reporting or Jira import.
Requirements: REQ-MILESTONE-UI-026, REQ-MILESTONE-UI-027, REQ-MILESTONE-UI-028, REQ-MILESTONE-UI-029, REQ-MILESTONE-UI-030, REQ-MILESTONE-UI-031, REQ-MILESTONE-UI-032

## Goal

Download an up-to-date, hierarchically numbered WBS in Excel, CSV for Jira, or Markdown without leaving the console.

## Preconditions

- The project is configured in gin-console.

## Main flow
1. The PM opens either a Milestone page (for one milestone) or the Milestones list page (for the whole project).
2. The PM opens the `Export WBS` menu in the header and chooses Excel, CSV for Jira, or Markdown.
3. The browser requests `GET /api/milestones/{project}/wbs` with the chosen `format` and optional `milestone`.
4. The system reads the project's Beads snapshot (open and closed beads, excluding prep tasks and merge gates) and joins planned dates, forecast end, and epic estimates from `gin`.
5. The system builds the deterministically ordered WBS tree, computes rollups and `Depends on` references, serializes the chosen format, and returns it as a file download.
6. The browser saves `<project>[-<milestone>]-wbs-<YYYY-MM-DD>.<ext>`.

## Alternative flows
### 4a. Scope is empty
1. The project has no beads or the milestone has no child epics.
2. The system returns a valid file with the header row (and the milestone row when milestone-scoped).
3. Resume at step 6.

## Exception flows
### 4e. `gin` CLI is unavailable or fails
1. The system builds the WBS from the Beads snapshot alone, leaving `gin`-derived dates and epic estimates blank.
2. The system attaches a warning in `X-WBS-Warning` (and in the Excel `About` sheet or Markdown header).
3. Resume at step 6.

### 4f. The Beads export cannot be read
1. The system responds 502 with the reason.
2. Use case ends.

### 3e. Unknown project, unknown milestone, or invalid format
1. The system responds 404 (unknown project or milestone) or 422 (invalid format or milestone id).
2. Use case ends.

## Business rules
- Hierarchy, ordering, numbering, and exclusions: REQ-MILESTONE-UI-027.
- Row columns, assignee rule, rollups, and `Depends on`: REQ-MILESTONE-UI-028.
- Excel, CSV for Jira, and Markdown formats: REQ-MILESTONE-UI-029, REQ-MILESTONE-UI-030, REQ-MILESTONE-UI-031.

## Postconditions

- A downloadable WBS file is delivered to the PM.
- Nothing in the project or Beads changed.
