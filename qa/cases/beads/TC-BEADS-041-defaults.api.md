# TC-BEADS-041: Defaults

- **REQ:** REQ-BEADS-001@81461c32
- **Priority:** medium

**Preconditions:**
- Project `p` with epic `e-2` without a `kind:` label, a `Capabilities:` line or `req:` labels

**Steps:**
1. Send `GET /api/beads?project=p`

**Expected:**
- `e-2` has `kind: "capability"`, `capabilities: []`, `complexity: null` and `estimate_minutes: null`
