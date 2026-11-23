# TC-BEADS-056: Failed pull note

- **REQ:** REQ-BEADS-018@472f1f19
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** cb9ca9e1

**Preconditions:**
- `GET /api/projects/beads` is stubbed with project A (path `/tmp/a`, `pull` `{"status": "error", "error": "Merge conflict detected", "at": <1 minute ago>}`) and project B (`pull` `null`)
- Beads lists for A and B are stubbed

**Steps:**
1. Open `/my-tasks?project=A`
2. Open `/beads?project=A`

**Expected:**
- Each page shows one note: "Pulling Beads of A failed: Merge conflict detected. Run `bd dolt pull` in /tmp/a."
- Neither note names B
- The lists are shown below the note
