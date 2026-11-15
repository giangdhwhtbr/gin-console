# TC-REPORTS-048: Total cache ratio

- **REQ:** REQ-REPORTS-003@3cabb52c
- **Priority:** medium

**Preconditions:**
- Project `alpha` has two closed beads
- The own share of the first holds model tokens input 100, cache_read 300, cache_write 0
- The own share of the second holds model tokens input 100, cache_read 0, cache_write 0

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports?project=alpha`

**Expected:**
- `totals.cache_ratio` is 0.6
