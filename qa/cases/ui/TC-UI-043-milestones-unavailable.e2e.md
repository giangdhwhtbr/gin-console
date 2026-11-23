# TC-UI-043: Milestones unavailable

- **REQ:** REQ-UI-104@8a28fc31
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 68bd6b9e

**Preconditions:**
- Project `alpha` with open beads, and `GET /api/beads/milestones?project=alpha` answering 502

**Steps:**
1. Open `/beads?project=alpha`
2. Open `button "Milestone"`

**Expected:**
- The Milestone menu says `Milestones unavailable`
- Every open bead is shown
