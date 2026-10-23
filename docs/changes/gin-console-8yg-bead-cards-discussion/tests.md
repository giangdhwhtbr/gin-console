# Tests: Bead cards and discussion on beads

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-068 | manual | At 1280px open a bead with comments: details left, discussion right and sticky; scroll a long page and a long thread |
| TC-2 | REQ-UI-069 | manual | At 820px and 390px, and in the Tree and Graph panels: the tabs Details and Discussion (n), 44px high on a phone |
| TC-3 | REQ-UI-064 | manual | Put a Board card and a graph node of the same bead side by side in light and dark: same state icon, word and edge colour |
| TC-4 | REQ-UI-067 | manual | Look at epic, bug, feature, task and chore pills in light and dark; an epic in progress does not show two near hues |

## Evidence (2026-10-23)
- TC-1 to TC-4: **not run by the agent** (no browser in the session). The built branch was put on the live service (commit a61c883) for the user, who then decided to close track gin-console-8yg.4 and ship. No pass or fail was recorded for these cases; the contrast of the colours behind TC-4 is covered by `tokens.test.ts`, and the classes behind TC-1 and TC-2 are checked in `Discussion.test.tsx`.
