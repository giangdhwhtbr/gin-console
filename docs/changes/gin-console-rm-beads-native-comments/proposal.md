# Comments and authors

Epic: gin-console-rm-beads-native
Date: 2026-10-21

## Why
The bead page shows a comment count but not the comments, and none of a bead's design, notes, acceptance criteria or close reason, so Scotty is still needed to read them. The epic ends with retiring Scotty, and the agreed parity list (comment text, who wrote what, dependency tree) must be met first. This is change C of five under the epic (A browse and B Board and Focus are shipped, C comments and authors, D dependency tree, E retire Scotty).

## What Changes
- A new read-only endpoint `GET /api/beads/{project}/{id}/comments` returns a bead's comments (author, time, text).
- The bead detail also returns `created_by` and the plain-text fields `design`, `notes`, `acceptance_criteria` and `close_reason`; the bead list rows carry `created_by`.
- The bead page shows "Created by", the text sections that have content, and a Comments section loaded after the page, with its own error and Retry.
- Authors are shown by name as written by `bd`; no guess is made about human or agent (the data cannot tell them apart).

## User Stories
### US-1: Read the discussion on a bead
As the console owner, I want to read a bead's comments with their authors and times, so that I no longer need Scotty to follow what was said.
REQ: REQ-BEADS-008, REQ-UI-039, REQ-UI-040

Acceptance criteria:
- A bead with comments shows them oldest first as plain text with author and time; a failure shows an error and a Retry for that section only.

### US-2: See the whole bead
As the console owner, I want the author and the design, notes, acceptance criteria and close reason of a bead, so that the console shows what the bead says.
REQ: REQ-BEADS-009, REQ-UI-038

Acceptance criteria:
- "Created by" is shown, and each of the four text sections appears only when it has content, as plain text.

## Capabilities Affected
- `beads`: ADDED REQ-BEADS-008, REQ-BEADS-009.
- `ui`: ADDED REQ-UI-038..040.

## Non-goals
Writing or editing comments, Markdown rendering, a human/agent badge, `created_by` on the List or Board, searching comment text, the dependency tree (change D), retiring Scotty (change E).

## Success Criteria
All scenarios have tests; on the live host the bead page of `qwikfone-02a.1` shows its comment with author and time, and a bead with design or acceptance criteria shows those sections.
