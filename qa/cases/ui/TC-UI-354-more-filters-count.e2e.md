# TC-UI-354: More filters count

- **REQ:** REQ-UI-145@493153aa
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 12106438

**Preconditions:**
- Window 1440px wide
- URL `?project=example&priority=1&label=ui&label_mode=all&kind=technical&status=open`

**Steps:**
1. Open the page

**Expected:**
- `button "More filters"` shows the count 3
