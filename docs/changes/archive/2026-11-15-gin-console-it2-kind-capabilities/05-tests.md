# Tests: Kind capabilities

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-BEADS-001, REQ-UI-108, REQ-UI-109 | manual | On the deployed console with the example project (kind labels, `Capabilities:` lines and `req:` labels added by the generator): a technical epic shows "Technical" on its List row, Board card, bead page and Gantt label; a capability epic shows no badge; an epic's bead page shows capability chips and "Estimate <n>d", and its row "<complexity> · <n>d"; Kind "Technical" keeps its tracks; Capability filters by `req:` capability; the milestone Beads tab offers both filters; screenshots at 1440×900 and 390×844; pass, claude (Playwright on the deployed build of c33e76d with the example project, 34/34 checks at both sizes, screenshots in qa/evidence/2026-11-15-it2-tc1-run2; the first run on 3af7080 found the kind badge clipping the List cell and squeezing the Gantt title on a phone, fixed in b6ed5df; manual validation delegated by giangdhwhtbr 2026-11-15) |
