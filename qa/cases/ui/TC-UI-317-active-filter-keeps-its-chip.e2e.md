# TC-UI-317: Controls keep their pills

- **REQ:** REQ-UI-140@7e27d5df
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-49-44
- **Checked:** f9fd5b2f

**Preconditions:**
- Project `P` reports open and closed beads

**Steps:**
1. Open `/beads?project=P&view=list&status=open`
2. Find the Status filter control

**Expected:**
- The Status filter control is named "Status 1"
- It shows its count "1" in a tinted pill (the identity wash background)
