# TC-UI-341: Nothing to clear

- **REQ:** REQ-UI-143@b65838eb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** afef7599

**Preconditions:**
- Project `example` has current milestone `ex-m2`
- URL has no `milestone` and no other filter
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example`

**Expected:**
- There is no `button "Clear filters"`
