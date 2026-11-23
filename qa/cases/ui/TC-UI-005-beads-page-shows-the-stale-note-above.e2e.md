# TC-UI-005: Beads page shows the stale note above the list

- **REQ:** REQ-UI-103@e6e5851a
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** 024392ab

**Preconditions:**
- Project A whose `GET /api/projects/beads` entry has `beads.stale: true` and which has beads

**Steps:**
1. Open /beads?project=A

**Expected:**
- A note says "Beads of A may be out of date. Run `bd export -o .beads/issues.jsonl` in A."
- The list of beads is shown below the note
