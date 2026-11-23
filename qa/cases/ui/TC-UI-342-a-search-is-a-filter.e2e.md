# TC-UI-342: A search is a filter

- **REQ:** REQ-UI-143@b65838eb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 604f8b08

**Preconditions:**
- Project `example` has current milestone `ex-m2`
- The Beads page is shown at 1440px wide with no filter

**Steps:**
1. Type "pay" into the `searchbox "Search"`

**Expected:**
- `button "Clear filters"` is shown
