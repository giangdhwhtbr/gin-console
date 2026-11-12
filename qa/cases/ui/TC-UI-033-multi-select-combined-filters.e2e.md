# TC-UI-033: Multi-select combined filters

- **REQ:** REQ-UI-025@3a09b28c
- **Priority:** medium

**Preconditions:**
- Project `alpha` with open P1 beads, in-progress P1 beads, and closed P2 beads

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Choose `open` and `in_progress` in the Status filter
3. Choose `1` in the Priority filter

**Expected:**
- Only open and in-progress P1 beads are shown
- The URL query contains `status=open,in_progress&priority=1`
