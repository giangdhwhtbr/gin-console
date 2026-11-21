# TC-BEADS-054: No remote on the card

- **REQ:** REQ-BEADS-018@3ceab845
- **Priority:** medium

**Preconditions:**
- `GET /api/projects` is stubbed with project B whose `pull.status` is `no_remote`

**Steps:**
1. Open `/`

**Expected:**
- B's card shows "no Dolt remote"
- B's card shows no error
