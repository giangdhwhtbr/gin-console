# TC-BEADS-065: Track not found

- **REQ:** REQ-BEADS-019@afe14198
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 73dec0dd

**Preconditions:**
- Project `alpha` has epic `e-1` and a gate `g-2` with parent `e-1` titled `external: .planning/plans/other.md#7`
- No child of `e-1` has track 7

**Test data:**
- None

**Steps:**
1. Send `GET /api/beads?project=alpha`

**Expected:**
- `g-2` has `waits_for` `{"plan": ".planning/plans/other.md", "number": 7, "track_id": null, "lane": null}`
