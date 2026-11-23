# TC-UI-173: Bead without a lane shows no lane

- **REQ:** REQ-UI-115@ed5e8117
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** ab577b2f

**Preconditions:**
- A bead has `lane` `null`

**Steps:**
1. Open the List view

**Expected:**
- The List row of the bead shows no lane (no dot and no name)
