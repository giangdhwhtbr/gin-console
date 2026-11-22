# TC-BEADS-080: Shared link means the viewer

- **REQ:** REQ-BEADS-024@be8b68ca
- **Priority:** medium

**Preconditions:**
- The browser holds the email `ann@example.com` in localStorage under `gin-console.email`
- Project `example` has beads assigned to `ann`, to `ann@example.com` and to `bob`

**Test data:**
- None

**Steps:**
1. Open `/beads?project=example&assignee=me`

**Expected:**
- The list shows the beads assigned to `ann` and to `ann@example.com`
- The list does not show the bead assigned to `bob`
- "Me" is selected in the Assignee filter
