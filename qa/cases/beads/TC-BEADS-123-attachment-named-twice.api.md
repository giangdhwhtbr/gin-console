# TC-BEADS-123: Attachment named twice

- **REQ:** REQ-BEADS-026@8e331dd0
- **Priority:** medium

**Preconditions:**
- Bead `b-1` in project `alpha` whose description holds `![First](attachment:A)` and whose notes hold `[again](attachment:` followed by `A` in upper case and `)`

**Steps:**
1. Send `GET /api/beads/alpha/b-1`

**Expected:**
- `images` holds one image with `sha256` `A` and caption "First"
