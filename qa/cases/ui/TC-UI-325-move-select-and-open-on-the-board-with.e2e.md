# TC-UI-325: Move, select and open on the Board with the keyboard

- **REQ:** REQ-UI-037@ce7edeaf
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-44-27
- **Checked:** 8b1fb00c

**Preconditions:**
- The Board of project `example` is shown at 1280px wide
- Several cards `[data-card]` are shown and none is selected

**Steps:**
1. Press the Right arrow key until a card has focus
2. Press the Down arrow key
3. Press `Enter`
4. Press `Enter` again

**Expected:**
- Focus moves from card to card and each card itself takes the focus
- After the first `Enter` the focused card has `aria-current="true"`, the URL has `select=<id>` and `complementary "Bead details"` shows it
- After the second `Enter` the bead page of that card is shown
