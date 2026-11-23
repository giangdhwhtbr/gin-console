# TC-BEADS-054: No remote shows no note

- **REQ:** REQ-BEADS-018@472f1f19
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** b3bf549a

**Preconditions:**
- `GET /api/projects/beads` is stubbed with project B whose `pull.status` is `no_remote`

**Steps:**
1. Open `/my-tasks?project=B`
2. Open `/beads?project=B`

**Expected:**
- Neither page shows a pull note
- Neither page shows "no Dolt remote" or an error
