# TC-UI-159: Lanes follow the filters

- **REQ:** REQ-UI-111@c5095b0c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 3cf47366

**Preconditions:**
- Assignee `bao` holds only lane `fe` of `ex-e12`

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12&assignee=bao`

**Expected:**
- Only the row `fe` is drawn, with its header
