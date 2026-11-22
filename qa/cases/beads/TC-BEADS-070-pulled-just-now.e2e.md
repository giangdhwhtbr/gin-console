# TC-BEADS-070: Pulled just now

- **REQ:** REQ-BEADS-018@3ceab845
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** a459ae32

**Preconditions:**
- `GET /api/projects` is stubbed with project A whose `pull` is `{"status": "ok", "at": <10 seconds ago>, "error": null}`

**Steps:**
1. Open `/`

**Expected:**
- A's card shows "pulled just now"
