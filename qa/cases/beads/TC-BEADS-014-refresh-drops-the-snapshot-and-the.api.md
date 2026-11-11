# TC-BEADS-014: Refresh drops the snapshot and the report cache

- **REQ:** REQ-BEADS-012@fa3e7871
- **Priority:** high

**Preconditions:**
- Project P whose snapshot is current and a report of P cached less than 60 seconds ago

**Steps:**
1. Send `POST /api/refresh`
2. Request the list of P
3. Request the report of P

**Expected:**
- The refresh response is 204
- The file was read again
- The report was built again
