# TC-UI-130: Choose on the Beads page

- **REQ:** REQ-UI-123@1d5f1e95
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 661db1cd

**Preconditions:**
- Projects `a` and `b` are configured, each with a bead

**Steps:**
1. Open `/beads?project=a&view=board&milestone=m1&status=open`
2. Open the project switcher
3. Choose project `b`

**Expected:**
- The URL becomes `/beads?project=b&view=board`
- The Board of `b` is shown
