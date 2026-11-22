# TC-UI-130: Choose on the Beads page

- **REQ:** REQ-UI-123@96cd57cc
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 70b94cd4

**Preconditions:**
- Projects `a` and `b` are configured, each with a bead

**Steps:**
1. Open `/beads?project=a&view=board&milestone=m1&status=open`
2. Open the project switcher
3. Choose project `b`

**Expected:**
- The URL becomes `/beads?project=b&view=board`
- The Board of `b` is shown
