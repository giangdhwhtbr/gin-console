# TC-UI-329: List open and close with Right and Left

- **REQ:** REQ-UI-046@9b0edb23
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** f4efd3f0

**Preconditions:**
- The List view of project `example` is shown with a closed epic `e-1` that has children, and focus is on its row

**Steps:**
1. Press Right
2. Press Right again
3. Press Left
4. Press Left again

**Expected:**
- The first Right opens the branch of `e-1`
- The second Right moves focus to the first child of `e-1`
- The first Left moves focus back to the parent row `e-1`
- The second Left closes the branch of `e-1`
