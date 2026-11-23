# TC-UI-338: Filter bar on one line at 1024px

- **REQ:** REQ-UI-142@7bd8f166
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 15aa4051

**Preconditions:**
- Project `example` is stubbed with current milestone `ex-m2` titled "Checkout v2"
- Window 1024px wide
- URL `?project=example&status=open,in_progress&assignee=alice&priority=1`

**Steps:**
1. Open the page

**Expected:**
- The search box (at least 8rem wide), the chips Milestone, Status and Assignee and `button "More filters"` share one line
- `button "Clear filters"`, the count and `switch "Show closed"` are on the line below
- A chip whose values do not fit ends with "…" and has its full text as `title`; its name and "×" stay whole
- No text overlaps another
