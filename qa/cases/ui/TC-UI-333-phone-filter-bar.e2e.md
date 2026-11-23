# TC-UI-333: Phone filter bar

- **REQ:** REQ-UI-084@f877255d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 02a49b8e

**Preconditions:**
- The Beads page of project `example` at 390px wide, `?project=example&status=open`
- The current milestone is in effect

**Steps:**
1. Open the page

**Expected:**
- The bar shows the `searchbox "Search"` without a `/` hint
- The bar shows `button "Filters"` with the count 1
- No chip and no `button "More filters"` is shown
- The count of beads and `switch "Show closed"` are on the line below
