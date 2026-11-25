# TC-UI-387: No next command on a closed task or an epic panel

- **REQ:** REQ-UI-151@b4c85eae
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` has a closed task `t-1` and an open epic `e-2` shown in the details panel of the Beads list

**Steps:**
1. Open `/beads/P/t-1`
2. Open `/beads?project=P` and select the epic `e-2` in the list

**Expected:**
- The header of the closed task shows no "Next"
- The details panel of the epic shows no "Next"
