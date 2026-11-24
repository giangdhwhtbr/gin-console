# TC-UI-029: Retired tab in a link

- **REQ:** REQ-UI-095@c0140122
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** b6b40867

**Preconditions:**
- The URLs `/reports?project=alpha&days=7&tab=quality`, `/reports?project=alpha&tab=coverage` and `/reports?project=alpha`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&days=7&tab=quality`
2. Open `/reports?project=alpha&tab=coverage`
3. Open `/reports?project=alpha`

**Expected:**
- The URLs become `/reports/rework?project=alpha&days=7`, `/reports/status?project=alpha` (with scope) and `/reports/status?project=alpha` (with scope), without adding a history entry
