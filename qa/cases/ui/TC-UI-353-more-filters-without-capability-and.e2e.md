# TC-UI-353: More filters without capability and sprint

- **REQ:** REQ-UI-145@493153aa
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 3a0e84e5

**Preconditions:**
- Project `example` whose beads have no capability and no `sprint:<name>` label
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example`
2. Click `button "More filters"`

**Expected:**
- The popover holds Priority, Labels, Type and Kind only
