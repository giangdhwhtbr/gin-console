# TC-MILESTONE-UI-069: View and filters in the URL

- **REQ:** REQ-MILESTONE-UI-018@03e47834
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-15T14-02-27

**Preconditions:**
- The Beads tab of milestone `m2` of project `p` is shown

**Steps:**
1. Open `/milestones/p/m2?tab=beads`
2. Choose Board in the views
3. Choose the status "open"
4. Reload the page

**Expected:**
- The URL is `/milestones/p/m2?tab=beads&view=board&status=open`
- After the reload the same Board and filter are shown
