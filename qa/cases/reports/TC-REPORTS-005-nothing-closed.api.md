# TC-REPORTS-005: Nothing closed

- **REQ:** REQ-REPORTS-004@768a4473
- **Priority:** medium

**Preconditions:**
- No closed bead in the period

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `overall` has no cycle time and no lead time
