# TC-BEADS-053: Pulled

- **REQ:** REQ-BEADS-018@3ceab845
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 8ef1fe42

**Preconditions:**
- `GET /api/projects` is stubbed with project A whose `pull` is `{"status": "ok", "at": <2 minutes ago>, "error": null}`

**Steps:**
1. Open `/`

**Expected:**
- A's card shows "pulled 2 minutes ago"
- The pull line's tooltip is the full `at` time
