# Tests: Strung visual system

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-059, REQ-UI-064, REQ-UI-136, REQ-UI-137, REQ-UI-138, REQ-UI-139, REQ-UI-140, REQ-UI-141, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-024, REQ-MILESTONE-UI-025, REQ-UI-110 | manual (Playwright by claude) | pass, claude (Playwright on the Tailscale build of 72cffe7, 625/625 checks, screenshots in qa/evidence/2026-11-22-strung-tc1-run3). Row-height expectation: equal at 1440 and 1920, not checked at 390 (REQ-MILESTONE-UI-013 lets label lines wrap below 1024px). The mobile list hides the strand below the @xl container by design, so list strand checks run at 1440. |
