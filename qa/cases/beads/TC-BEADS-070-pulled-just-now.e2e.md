# TC-BEADS-070: Pulled just now

- **REQ:** REQ-BEADS-018@3ceab845
- **Priority:** medium

**Preconditions:**
- `GET /api/projects` is stubbed with project A whose `pull` is `{"status": "ok", "at": <10 seconds ago>, "error": null}`

**Steps:**
1. Open `/`

**Expected:**
- A's card shows "pulled just now"
