# TC-UI-157: Lanes rows and columns

- **REQ:** REQ-UI-111@c5095b0c
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9d851e61

**Preconditions:**
- Epic `ex-e12` has lanes `be` (tracks 1 and 2, track 2 blocked by track 1), `fe` (track 3), `qa` (track 4, blocked by merge gates waiting for tracks 2 and 3), `infra` (tracks 5 and 6) and two children without a lane

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The rows are `be`, `fe`, `infra`, `qa` and "No lane", in that order
- The card of track 2 is in a later column than the card of track 1
- The card of track 4 is in a later column than the cards of tracks 2 and 3
