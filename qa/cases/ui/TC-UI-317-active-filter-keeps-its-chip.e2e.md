# TC-UI-317: Controls keep their pills

- **REQ:** REQ-UI-140@aa5bbea9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-31-58
- **Checked:** 320820c6

**Preconditions:**
- Project `P` reports open and closed beads

**Steps:**
1. Open `/beads?project=P&view=list&status=open`
2. Find the Status filter control

**Expected:**
- The Status filter control is named "Status 1"
- It shows its count "1" in a tinted pill (the identity wash background)
