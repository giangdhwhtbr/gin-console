# TC-UI-246: Sections in the sidebar

- **REQ:** REQ-UI-129@de1adeec
- **Priority:** high

**Preconditions:**
- Project `a` is configured with a report
- The window is 1440px wide and the sidebar is expanded

**Steps:**
1. Open `/reports?project=a&tab=delivery`

**Expected:**
- The sidebar lists Team, Delivery, Velocity and Quality under Reports, each with its headline
- Delivery is marked `aria-current="page"`
- The page shows no tab list
