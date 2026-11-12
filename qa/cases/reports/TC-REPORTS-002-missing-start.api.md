# TC-REPORTS-002: Missing start

- **REQ:** REQ-REPORTS-004@849689dc
- **Priority:** medium

**Preconditions:**
- A closed task without `started_at`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- It counts in throughput and lead time and not in cycle time
