# TC-UI-043: Milestones unavailable

- **REQ:** REQ-UI-104@3cd94953
- **Priority:** medium

**Preconditions:**
- Project `alpha` with open beads, and `GET /api/beads/milestones?project=alpha` answering 502

**Steps:**
1. Open `/beads?project=alpha`

**Expected:**
- The Milestone select says `Milestones unavailable`
- Every open bead is shown
