# TC-UI-279: Plain labels in the Milestones list

- **REQ:** REQ-UI-134@16348b81
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `alpha` has `velocity.say_do: 0.62` and `lanes: 2`

**Steps:**
1. Open `/milestones?project=alpha`

**Expected:**
- The row of `m1` reads "Commitment met 62%" under the column "Commitment met"
- Its lanes are under the column "Parallel lanes"
- The words carry a tooltip that says what they count
