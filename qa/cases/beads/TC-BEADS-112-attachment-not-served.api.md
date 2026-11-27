# TC-BEADS-112: Attachment not served

- **REQ:** REQ-BEADS-032@8984003b
- **Priority:** high

**Preconditions:**
- Bead `a-1` of `alpha` has the pruned entry `A`; bead `a-2` has the available entry `B`; there is no bead `a-9`

**Steps:**
1. Send `GET /api/beads/alpha/a-1/attachments/A`
2. Send `GET /api/beads/alpha/a-1/attachments/B`
3. Send `GET /api/beads/alpha/a-1/attachments/ab12`
4. Send `GET /api/beads/alpha/a-2/attachments/` followed by `B` in upper case
5. Send `GET /api/beads/alpha/a-9/attachments/B`

**Expected:**
- Every response is 404 with the body `{"error":"not found"}`
