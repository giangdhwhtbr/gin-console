# TC-BEADS-086: File link and absolute path line

- **REQ:** REQ-BEADS-026@ac85fc9c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-27T00-00-02-api
- **Checked:** c72e6e69

**Preconditions:**
- Bug `b-1` in project `p` whose description holds `[BUG-005_1.png](file:///home/gin/att/BUG-005_1.png)` followed by ``Absolute Path: `/home/gin/att/BUG-005_1.png` ``

**Steps:**
1. Send `GET /api/beads/p/b-1`

**Expected:**
- `images` holds one image with `path` `/home/gin/att/BUG-005_1.png` and caption `BUG-005_1.png`
