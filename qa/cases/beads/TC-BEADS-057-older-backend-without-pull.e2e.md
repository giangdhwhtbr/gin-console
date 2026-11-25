# TC-BEADS-057: Older backend without pull

- **REQ:** REQ-BEADS-018@472f1f19
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** a4460ae3

**Preconditions:**
- `GET /api/projects/beads` is stubbed with projects that have no `pull` key

**Steps:**
1. Open `/beads?project=a`
2. Open `/my-tasks?project=a`

**Expected:**
- No pull note is shown on the Beads page or My work
