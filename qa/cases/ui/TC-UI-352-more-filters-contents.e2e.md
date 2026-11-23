# TC-UI-352: More filters contents

- **REQ:** REQ-UI-145@493153aa
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e5d896ba

**Preconditions:**
- Project `example` whose beads have capabilities and `sprint:<name>` labels
- Window 1440px wide

**Steps:**
1. Open `/beads?project=example`
2. Click `button "More filters"`

**Expected:**
- The popover holds Priority, Labels, Type, Kind, Capability and Sprint in that order
