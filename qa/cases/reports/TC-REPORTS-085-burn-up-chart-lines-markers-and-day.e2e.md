# TC-REPORTS-085: Burn-up chart lines, markers and day hover details

- **REQ:** REQ-REPORTS-029@fd17f2c3
- **Priority:** high

**Preconditions:**
- Active milestone `m2` with burn-up from 11 Nov to 23 Nov ending at 27 scope and 9.5 done points (`scope_from` 24, `scope_to` 27), `end` 2 Dec, pace finish 7 Dec, and 18 Nov having scope 27 and done 6

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&milestone=m2`
2. Hover or focus the 18 Nov day on the burn-up chart

**Expected:**
- The chart is titled "Burn-up" with accessible name "Burn-up: 9.5 of 27 points done; scope 24 → 27 points since kickoff"
- It draws Scope, Done, Needed pace, Forecast, Today, End 2 Dec and a legend naming the four lines
- Hovering or focusing 18 Nov shows "18 Nov", "Scope 27 points" and "Done 6 points"
