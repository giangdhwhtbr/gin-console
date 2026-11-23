# TC-UI-346: Unknown filter values are ignored

- **REQ:** REQ-UI-143@b65838eb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 68e3e1e8

**Preconditions:**
- Project `example` with its current milestone in effect
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example&kind=epicish&label_mode=some`

**Expected:**
- No Kind filter is active
- Labels match Any
- `button "More filters"` shows no count
- There is no `button "Clear filters"`
