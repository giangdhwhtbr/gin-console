# TC-BEADS-070: No note for another project

- **REQ:** REQ-BEADS-018@472f1f19
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 4a78c335

**Preconditions:**
- `GET /api/projects/beads` is stubbed with project A whose `pull` is `{"status": "error", "error": "Merge conflict detected", "at": <10 seconds ago>}` and project B whose `pull` is `{"status": "ok", "at": <10 seconds ago>, "error": null}`
- Beads lists for A and B are stubbed

**Steps:**
1. Open `/my-tasks?project=B`
2. Open `/beads?project=B`

**Expected:**
- Neither page shows a pull note
- Neither page names A or its error
