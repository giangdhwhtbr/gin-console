# TC-UI-344: Current milestone named in the URL

- **REQ:** REQ-UI-143@b65838eb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** ad6f8ddc

**Preconditions:**
- Project `example` where `ex-m2` is the current milestone
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example&milestone=ex-m2`

**Expected:**
- No filter is active
- There is no `button "Clear filters"`
