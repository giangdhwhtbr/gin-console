# TC-UI-025: Shared link

- **REQ:** REQ-UI-095@3fd9927e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 4adad74e

**Preconditions:**
- The URL `/reports/rework?project=alpha&days=7`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its row of section links

**Test data:**
- None

**Steps:**
1. Open `/reports/rework?project=alpha&days=7`

**Expected:**
- Rework is marked `aria-current="page"` and its panel shows the report for `alpha` and 7 days
