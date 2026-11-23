# TC-UI-279: Plain labels in the Milestones list

- **REQ:** REQ-UI-134@69f0a1c6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** eda8458a

**Preconditions:**
- Milestone `m1` of project `alpha` has `velocity.say_do: 0.62` and `lanes: 2`

**Steps:**
1. Open `/milestones?project=alpha`

**Expected:**
- The row of `m1` reads "Commitment met 62%" under the column "Commitment met"
- Its lanes are under the column "Parallel lanes"
- The words carry a tooltip that says what they count
