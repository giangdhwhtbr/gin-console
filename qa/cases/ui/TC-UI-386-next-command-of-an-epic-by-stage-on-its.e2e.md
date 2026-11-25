# TC-UI-386: Next command of an epic by stage on its page

- **REQ:** REQ-UI-151@b4c85eae
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Epic `e-1` in project `P`; `GET /api/beads/P/e-1/workflow` answers stage `plan` after a delay, then a case with a failing request

**Steps:**
1. Open `/beads/P/e-1` while the workflow request is not answered yet
2. Wait for the workflow request to answer with the stage `plan`
3. Open `/beads/P/e-1` again with the workflow request failing with 502

**Expected:**
- The header shows no "Next" while the workflow loads
- The header shows `/gin:plan e-1`
- The header shows no "Next" when the workflow request fails
