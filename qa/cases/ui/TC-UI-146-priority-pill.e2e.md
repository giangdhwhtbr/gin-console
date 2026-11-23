# TC-UI-146: Priority as bold text

- **REQ:** REQ-UI-110@6bf5889e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-45-40
- **Checked:** cc00e043

**Preconditions:**
- Project `alpha` has beads at P0, P1 and P2

**Steps:**
1. Open `/beads?project=alpha&view=list`

**Expected:**
- `P0` and `P1` are bold in the text color
- `P2` is in the muted color
- None of them is a pill
