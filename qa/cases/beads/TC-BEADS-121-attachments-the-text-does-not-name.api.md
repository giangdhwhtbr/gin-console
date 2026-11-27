# TC-BEADS-121: Attachments the text does not name

- **REQ:** REQ-BEADS-026@8e331dd0
- **Priority:** medium

**Preconditions:**
- Bug `b-1` in project `alpha` whose description holds `![Step 1](attachment:A)` and `shots/c.png`, and whose `metadata.attachments` is the JSON text of `[{sha256: B, caption: "Step 2"}, {sha256: A}, {sha256: "x"}, "oops"]`

**Steps:**
1. Send `GET /api/beads/alpha/b-1`

**Expected:**
- `images` lists `A` (caption "Step 1"), `shots/c.png` and `B` (caption "Step 2"), numbered 1 to 3
- The entries `{sha256: "x"}` and `"oops"` are not listed
