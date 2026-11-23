# TC-UI-371: Selection kept across views

- **REQ:** REQ-UI-148@2cdbf144
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 329a07b6

**Preconditions:**
- The List view at 1280px wide with `select=x-1`
- `x-1` is a ready P3 bead that no Focus column holds

**Steps:**
1. Choose the Focus view

**Expected:**
- The URL still has `select=x-1`
- The panel shows `x-1` with the note "Not in the current list"
