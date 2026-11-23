# TC-UI-320: Sidebar brand mark

- **REQ:** REQ-UI-141@008ef200
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 9bb71cc9

**Preconditions:**
- The window is 1440px wide with the sidebar expanded

**Steps:**
1. Open `/`
2. Read the sidebar header

**Expected:**
- The sidebar header shows a mark of three beads on a thread before the name "gin-console"
- The beads are Done (filled), In progress (filled) and Ready (hollow), in that order
- The thread is in the identity colour (amethyst)
