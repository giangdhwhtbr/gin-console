# TC-MILESTONE-UI-070: Changing tab

- **REQ:** REQ-MILESTONE-UI-018@03e47834
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-15T14-02-27

**Preconditions:**
- Milestone `m2` of project `p`

**Steps:**
1. Open `/milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w`
2. Choose Gantt
3. Choose Beads

**Expected:**
- After Gantt the URL is `/milestones/p/m2?start=2026-11-10&zoom=2w`
- After Beads the URL is `/milestones/p/m2?tab=beads&start=2026-11-10&zoom=2w`
- The List view shows no filter
