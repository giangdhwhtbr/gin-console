# TC-BEADS-124: Attachment first, file as fallback

- **REQ:** REQ-BEADS-027@55f324e9
- **Priority:** high

**Preconditions:**
- Bug `a-1` of project `alpha` with image 1 (attachment `A`, `local: qa/evidence/r1/01.png`) and image 2 (attachment `B`, `local: qa/evidence/r1/02.png`)
- Both files are PNG files in the project, attachment `A` is available and attachment `B` is not fetched

**Steps:**
1. Send `GET /api/beads/alpha/a-1`

**Expected:**
- Image 1 is available with `served_as` `attachment`
- Image 2 is available with `served_as` `file`
