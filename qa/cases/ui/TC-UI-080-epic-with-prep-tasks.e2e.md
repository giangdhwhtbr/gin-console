# TC-UI-080: Epic with prep tasks

- **REQ:** REQ-UI-089@35bfa375
- **Priority:** high

**Preconditions:**
- The report of project `alpha` has top epics `e-1` with `closed_children` 1, `children` 2, `closed_prep_children` 1 and `prep_children` 1, and `e-2` with `prep_children` 0

**Steps:**
1. Open `/reports?project=alpha&days=90&tab=usage`

**Expected:**
- The row of `e-1` shows "1/2" and "Prep 1/1"
- The row of `e-2` shows no prep count
