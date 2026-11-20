# TC-UI-185: Lane box header

- **REQ:** REQ-UI-118@e68b6fe0
- **Priority:** high

**Preconditions:**
- Epic `ex-e12` has lane be with tracks 1 and 2
- `bd` reports track 1 closed and track 2 in_progress with assignee ann and a claim lease expiring tomorrow at 16:00

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- The be box header shows a colour swatch
- Its first line reads "be" and "Running"
- Its second line reads "ann · lease until <tomorrow> 16:00 · 1/2 closed"
