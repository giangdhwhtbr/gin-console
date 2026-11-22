# TC-BEADS-078: Same handle at two domains

- **REQ:** REQ-BEADS-023@7ee5b152
- **Priority:** medium

**Preconditions:**
- Project `example` has milestone `m1` whose scope holds beads assigned to `ann@a.example` and `ann@b.example`

**Test data:**
- None

**Steps:**
1. Send `GET /api/reports/team?project=example&milestone=m1`

**Expected:**
- `members` holds one row named `ann`
- The `scope` of that row counts both beads
- `members` holds no row named `ann@a.example` or `ann@b.example`
