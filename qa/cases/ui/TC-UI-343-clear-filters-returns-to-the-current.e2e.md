# TC-UI-343: Clear filters returns to the current milestone

- **REQ:** REQ-UI-143@b65838eb
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 9fc13364

**Preconditions:**
- Project `example` is stubbed with current milestone `ex-m2` titled "Checkout v2"
- Window 1440px wide
- URL `?project=example&milestone=all&q=pay&status=open&priority=1&label=ui&label_mode=all&closed=1&view=board&select=ex-e3`

**Steps:**
1. Open the page
2. Click `button "Clear filters"`

**Expected:**
- The URL is `?project=example&closed=1&view=board&select=ex-e3`
- The chip "Milestone Checkout v2 ×" is shown
- `button "Clear filters"` is gone
