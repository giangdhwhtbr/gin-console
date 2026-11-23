# TC-BEADS-055: Failed pull note follows the project switcher

- **REQ:** REQ-BEADS-018@472f1f19
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 68917155

**Preconditions:**
- `GET /api/projects/beads` is stubbed with project A (path `/tmp/a`, `pull` `{"status": "error", "error": "Merge conflict detected", "at": <1 minute ago>}`) and project B (`pull` `null`)
- Beads lists for A and B are stubbed

**Steps:**
1. Open `/my-tasks?project=A`
2. Choose project B in the project switcher

**Expected:**
- After step 1, the page shows one note naming A
- After step 2, the URL is `/my-tasks?project=B` and no note is shown
