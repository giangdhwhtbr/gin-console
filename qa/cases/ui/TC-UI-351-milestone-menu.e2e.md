# TC-UI-351: Milestone menu

- **REQ:** REQ-UI-144@6edc5604
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** df95b8a4

**Preconditions:**
- Project `example` is stubbed with current milestone `ex-m2` titled "Checkout v2"; milestone `ex-m3` is titled "Payments"
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example`
2. Click the body of the chip "Milestone Checkout v2 ×"
3. Choose `radio "Payments"` in `radiogroup "Milestone"`

**Expected:**
- The menu lists "All", "No milestone", then the groups Active, Planned and Closed
- The URL has `milestone=ex-m3`
- The chip reads "Milestone Payments ×"
