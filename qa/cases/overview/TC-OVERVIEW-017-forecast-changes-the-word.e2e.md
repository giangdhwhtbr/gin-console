# TC-OVERVIEW-017: Forecast changes the word

- **REQ:** REQ-OVERVIEW-007@7aa72ecb
- **Priority:** high

**Preconditions:**
- Project `a` has the open milestone `m1`, on track without a forecast
- The forecast answers with a `finish` after the `end` of `m1`, a few seconds after the page opens

**Steps:**
1. Open `/`
2. Wait for the forecast

**Expected:**
- The line of `m1` first shows the verdict "On track" and "Checking forecast"
- Then it shows "Late" and "Checking forecast" is gone
