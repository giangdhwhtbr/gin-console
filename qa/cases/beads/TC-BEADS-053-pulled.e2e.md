# TC-BEADS-053: Pulled

- **REQ:** REQ-BEADS-018@edacce0f
- **Priority:** high

**Preconditions:**
- `GET /api/projects` is stubbed with project A whose `pull` is `{"status": "ok", "at": <2 minutes ago>, "error": null}`

**Steps:**
1. Open `/`

**Expected:**
- A's card shows "pulled 2 minutes ago"
- The pull line's title is the full `at` time
