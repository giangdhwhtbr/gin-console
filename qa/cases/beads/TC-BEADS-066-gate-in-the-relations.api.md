# TC-BEADS-066: Gate in the relations

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 1753a71a

**Preconditions:**
- Project `alpha` has track `e-1.4` blocked by gate `g-1` titled `external: .planning/plans/2026-11-20-shop.md#2` waiting for track `e-1.2` of lane `be`

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads/alpha/e-1.4`

**Expected:**
- The dependency of `e-1.4` on `g-1` carries `waits_for` `{"plan": ".planning/plans/2026-11-20-shop.md", "number": 2, "track_id": "e-1.2", "lane": "be"}`
