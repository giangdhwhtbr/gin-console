# TC-BEADS-040: Kind, capabilities and estimate

- **REQ:** REQ-BEADS-001@877b56b8
- **Priority:** medium

**Preconditions:**
- Project `p` with epic `e-1` labelled `kind:technical`, with the description lines `Capabilities: beads, ui (new)` and `Complexity: medium (two views)` and `estimated_minutes: 960`, and its track `t-1` labelled `req:REQ-MILESTONE-UI-019`

**Steps:**
1. Send `GET /api/beads?project=p`

**Expected:**
- `e-1` has `kind: "technical"`, `capabilities: ["beads", "milestone-ui", "ui"]`, `complexity: "medium"` and `estimate_minutes: 960`
- `t-1` has `kind: null` and `capabilities: ["milestone-ui"]`
