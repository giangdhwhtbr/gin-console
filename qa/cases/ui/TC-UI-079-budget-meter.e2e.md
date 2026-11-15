# TC-UI-079: Budget meter

- **REQ:** REQ-UI-089@35bfa375
- **Priority:** medium

**Preconditions:**
- The report of project `alpha` has top epics `a-1` with budget 10 and cost 11.7, and `a-2` without a budget

**Steps:**
1. Open `/reports?project=alpha&days=90&tab=usage`

**Expected:**
- `a-1` shows a meter at 117% in the warning color
- `a-2` shows "No budget"
