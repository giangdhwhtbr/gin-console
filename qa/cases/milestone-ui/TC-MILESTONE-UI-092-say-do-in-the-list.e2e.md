# TC-MILESTONE-UI-092: Commitment met in the list

- **REQ:** REQ-MILESTONE-UI-001@6e63a57f
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` reports M1 with `velocity.say_do: 0.62`, M2 with `velocity.say_do: null`, and M3 without `velocity`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- M1 shows "Commitment met 62%"
- M2 shows "–" for commitment met
- M3 shows "–" for commitment met
