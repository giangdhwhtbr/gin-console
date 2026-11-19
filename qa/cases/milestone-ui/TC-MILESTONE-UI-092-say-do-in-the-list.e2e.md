# TC-MILESTONE-UI-092: Say/do in the list

- **REQ:** REQ-MILESTONE-UI-001@ecd0d02b
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports M1 with `velocity.say_do: 0.62`, M2 with `velocity.say_do: null`, and M3 without `velocity`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- M1 shows "Say/do 62%"
- M2 shows "–" for say/do
- M3 shows "–" for say/do
