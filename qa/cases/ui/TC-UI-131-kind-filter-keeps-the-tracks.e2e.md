# TC-UI-131: Kind filter keeps the tracks

- **REQ:** REQ-UI-108@8eb89f27
- **Priority:** medium

**Preconditions:**
- Project `alpha` has technical epic `e-1` with task `t-1`, and capability epic `e-2` with task `t-2`

**Steps:**
1. Set the window width to 1280 px
2. Open `/beads?project=alpha&milestone=all&view=list`
3. Choose "Technical" in the Kind filter

**Expected:**
- The URL has `kind=technical`
- `e-1` and `t-1` are shown
- `e-2` and `t-2` are not shown
