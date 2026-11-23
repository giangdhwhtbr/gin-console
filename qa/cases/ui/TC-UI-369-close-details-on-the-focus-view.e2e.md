# TC-UI-369: Close details on the Focus view

- **REQ:** REQ-UI-148@2cdbf144
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1bcac188

**Preconditions:**
- `t-1` is selected on the Focus view at 1280px wide

**Steps:**
1. Click "Close details"

**Expected:**
- The URL has no `select`
- The panel is gone and the columns take the full width
- The card of `t-1` has focus
