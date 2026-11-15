# TC-UI-132: Capability filter

- **REQ:** REQ-UI-108@8eb89f27
- **Priority:** medium

**Preconditions:**
- Project `alpha` has track `t-1` with capability `milestone-ui` and track `t-3` with capability `beads`

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads?project=alpha&milestone=all&view=list`
3. Choose `milestone-ui` in the Capability filter

**Expected:**
- The URL has `capability=milestone-ui`
- `t-1` is shown
- `t-3` is not shown
