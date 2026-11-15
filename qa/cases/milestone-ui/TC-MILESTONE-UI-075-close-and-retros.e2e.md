# TC-MILESTONE-UI-075: Close and retros

- **REQ:** REQ-MILESTONE-UI-019@0190d380
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `p` with a comment `[gin close] m1` holding `Delivered:`, `Spillover:` and `Action:`, and comments `[gin retro] m1 ann` and `[gin retro] m1 bao`

**Test data:**
- None

**Steps:**
1. Open `/milestones/p/m1?tab=retro`

**Expected:**
- The tab reads "Retro 2"
- The close block shows Delivered, Spillover and Action
- The retros of ann and bao follow the close block
