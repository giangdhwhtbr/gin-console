# TC-BEADS-122: Bad attachment addresses

- **REQ:** REQ-BEADS-026@8e331dd0
- **Priority:** low

**Preconditions:**
- Bead `b-1` in project `alpha` whose description holds `![key](attachment:ab12)` and whose `metadata.attachments` is `"none"`

**Steps:**
1. Send `GET /api/beads/alpha/b-1`

**Expected:**
- `images` is empty
