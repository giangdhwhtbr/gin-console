# TC-UI-290: Light palette values

- **REQ:** REQ-UI-059@69731486
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 1ee353dc

**Preconditions:**
- Project `P` reports at least one bead
- The light theme is on (`prefers-color-scheme: light`, no `dark` class on `<html>`)

**Test data:**
- Tokens `--page`, `--paper`, `--sunk`, `--rule`, `--graphite`, `--slate`, `--amethyst`, `--jade`, `--lapis`, `--amber`, `--hematite`, `--carnelian` read from `getComputedStyle(document.documentElement)` (the names the frontend stylesheet defines)

**Steps:**
1. Open `/beads?project=P&view=list`
2. Read the colour tokens of the document element

**Expected:**
- page is #F4F5F8, paper #FFFFFF, sunk #ECEEF3 and rule #DDE0E7
- graphite is #1B1D26 and slate #596072
- amethyst is #6A3DB8, jade #0E7A5C, lapis #2557D6, amber #AE500A, hematite #646A78 and carnelian #B42318
