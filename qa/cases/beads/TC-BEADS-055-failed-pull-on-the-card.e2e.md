# TC-BEADS-055: Failed pull on the card

- **REQ:** REQ-BEADS-018@edacce0f
- **Priority:** high

**Preconditions:**
- `GET /api/projects` is stubbed with project A whose `pull` is `{"status": "error", "error": "Merge conflict detected", "at": <1 minute ago>}` and which has beads counts

**Steps:**
1. Open `/`

**Expected:**
- A's card shows "pull failed: Merge conflict detected" as an error
- A's beads counts are shown as before
