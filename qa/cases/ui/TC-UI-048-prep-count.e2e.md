# TC-UI-048: Prep count

- **REQ:** REQ-UI-004@7ccf6049
- **Priority:** medium

**Preconditions:**
- Project `alpha` has beads counts open 3, in progress 1, blocked 0, ready 2 and `prep` 2
- Project `beta` has the same counts and `prep` 0

**Steps:**
1. Open `/`

**Expected:**
- The card of `alpha` shows the four counts and "prep 2"
- The card of `beta` shows no prep count
