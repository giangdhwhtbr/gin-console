# TC-UI-246: Sections in the sidebar

- **REQ:** REQ-UI-129@7be2b291
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** c88f2cf3

**Preconditions:**
- Project `a` is configured with a report
- The window is 1440px wide and the sidebar is expanded

**Steps:**
1. Open `/reports/delivery?project=a&milestone=m2`

**Expected:**
- The sidebar lists Status, Team, Delivery, Velocity and Rework under Reports, each with its headline
- Delivery is marked `aria-current="page"`
- The page shows no row of section links
