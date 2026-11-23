# TC-UI-340: Filter bar on the Graph tab of an epic page

- **REQ:** REQ-UI-142@7bd8f166
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 0a461c61

**Preconditions:**
- Epic `ex-e12` exists in project `example`
- Window 1440px wide

**Steps:**
1. Open the Graph tab of epic `ex-e12`

**Expected:**
- The bar shows the search box, `button "Status"`, `button "Assignee"`, `button "More filters"` and `switch "Show closed"`
- There is no Milestone filter and no count
