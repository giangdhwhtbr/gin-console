# TC-UI-337: Filter bar order on a wide window

- **REQ:** REQ-UI-142@7bd8f166
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 491ad078

**Preconditions:**
- Project `example` is stubbed with current milestone `ex-m2` titled "Checkout v2", with no other filter
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example`

**Expected:**
- One line holds, in this order: `searchbox "Search"` with the hint `/`, the chip "Milestone Checkout v2 ×", `button "Status"`, `button "Assignee"`, `button "More filters"`, the count "<shown> of <loaded>" and `switch "Show closed"`
- There is no `button "Clear filters"`
