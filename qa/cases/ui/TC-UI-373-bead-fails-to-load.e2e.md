# TC-UI-373: Bead fails to load

- **REQ:** REQ-UI-148@2cdbf144
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** f4061bbf

**Preconditions:**
- The Board at 1280px wide with `select=t-1`
- The request for `t-1` fails (stubbed 500)

**Steps:**
1. Open the page

**Expected:**
- The panel shows the error and a retry button
- The Board columns are still shown
