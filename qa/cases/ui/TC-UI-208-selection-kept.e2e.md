# TC-UI-208: Selection kept

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 6f14fe38

**Preconditions:**
- Project `p` has epic `e-1` with child `b`

**Steps:**
1. Open `/beads/p/e-1/graph?select=b`

**Expected:**
- The page of `e-1` is shown with `tab=graph`
- The URL has `select=b`
- `b` is selected
