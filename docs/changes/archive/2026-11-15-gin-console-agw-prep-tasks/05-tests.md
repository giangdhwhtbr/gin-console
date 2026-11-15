# Tests: Prep tasks

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-SERVER-006, REQ-UI-004, REQ-UI-028, REQ-UI-044, REQ-UI-049, REQ-UI-075, REQ-MILESTONE-UI-015 | manual | On the Tailscale deploy, with an epic that has a prep task (label `prep`): its progress in List, bead page, Dependencies and Gantt counts tracks only, and List, bead page and Gantt show "Prep x/y"; the prep row has a "Prep" chip; the project card's counts leave prep out and show the prep count; pass, claude (Playwright on the Tailscale build of 9f4f532 with the example project, 17/17 checks, screenshots in qa/evidence/2026-11-15-agw-tc1; manual validation delegated by giangdhwhtbr 2026-11-15) |
