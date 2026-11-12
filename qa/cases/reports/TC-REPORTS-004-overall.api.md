# TC-REPORTS-004: Overall

- **REQ:** REQ-REPORTS-004@849689dc
- **Priority:** medium

**Preconditions:**
- A closed task with cycle time 1 day and a closed bug with cycle time 3 days

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `overall` holds a cycle median of 2 days over 2 beads
