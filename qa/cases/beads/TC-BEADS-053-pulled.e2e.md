# TC-BEADS-053: Pulled

- **REQ:** REQ-BEADS-018@472f1f19
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 324632eb

**Preconditions:**
- `GET /api/projects/beads` is stubbed with project A whose `pull` is `{"status": "ok", "at": <2 minutes ago>, "error": null}`

**Steps:**
1. Open `/my-tasks?project=A`
2. Open `/beads?project=A`

**Expected:**
- Neither page shows a pull note
- No text on either page reads "pulled" with a time such as "2 minutes ago"
