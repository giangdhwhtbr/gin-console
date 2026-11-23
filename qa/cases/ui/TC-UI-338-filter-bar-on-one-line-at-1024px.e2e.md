# TC-UI-338: Filter bar on one line at 1024px

- **REQ:** REQ-UI-142@7bd8f166
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-44-27
- **Checked:** 357d396d

**Preconditions:**
- Project `example` is stubbed with current milestone `ex-m2` titled "Checkout v2"
- Window 1024px wide
- Beads `ex-1` (assignee `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`, in progress) and `ex-2` (assignee `bob`, open) in `ex-m2`, both priority 1
- URL `?project=example&status=open,in_progress,blocked,deferred&assignee=nguyen.thi.thanh.huong.payments-team@example-company.com.vn&priority=1`

**Steps:**
1. Open the page

**Expected:**
- The search box (at least 8rem wide), the chips Milestone, Status and Assignee and `button "More filters"` share one line
- `button "Clear filters"`, the count and `switch "Show closed"` are on the line below
- The Assignee chip, whose long address does not fit, ends with "…" and has its full text as `title`; its name and "×" stay whole
- No text overlaps another
