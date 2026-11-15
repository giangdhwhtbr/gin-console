# Tests: Project health

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-SERVER-005, REQ-SERVER-006, REQ-UI-003, REQ-UI-004 | manual | On the deployed console: the qwikfone card shows "workspace · 8 repos" and "Show repos" lists the 8 repos with branch and shape; an epic in progress on a card shows its stage from `gin state --workflow-id`, matching the CLI; ready epics show "ready"; no default-workflow gate chips remain; a project without workspace, team, warnings or waivers shows none of them; screenshots at 1440×900 and 390×844; pass, claude (Playwright on the deployed build of 19a1d65, 44/44 checks at both sizes: qwikfone "workspace · 8 repos" with 8 repos listed, qwikfone-6rui `execute`, qwikfone-swqh and qwikfone-d28z `discuss`, gin-console-5ox `execute`, each matching `gin state --workflow-id`, other epics "ready", no gate chips, no team line (team off), no horizontal overflow; screenshots in qa/evidence/2026-11-15-5ox-tc1; manual validation delegated by giangdhwhtbr 2026-11-15) |
