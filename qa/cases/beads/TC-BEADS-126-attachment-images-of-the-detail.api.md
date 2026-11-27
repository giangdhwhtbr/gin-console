# TC-BEADS-126: Attachment images of the detail

- **REQ:** REQ-BEADS-002@368f5c8f
- **Priority:** high

**Preconditions:**
- Bug `b-1` in project `alpha` whose description holds `![Step 1](attachment:A)` and whose entries are `{sha256: A}`, available, and `{sha256: B, name: "02.png", pruned_at: "2026-11-20T10:00:00Z"}`

**Steps:**
1. Send `GET /api/beads/alpha/b-1`

**Expected:**
- `images` is `{n: 1, path: null, sha256: A, caption: "Step 1", available: true, served_as: "attachment", reason: null}` and `{n: 2, path: null, sha256: B, caption: "02.png", available: false, served_as: null, reason: "pruned"}`
