# Tests: Visual foundation and responsive app shell

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-UI-056 | manual | Screenshots at 360, 768 and 1280px: tab bar, rail, sidebar |
| TC-2 | REQ-UI-059 | manual | Look at the status colours and input outlines in light and dark in the browser; the numbers are checked by `tokens.test.ts` |
| TC-3 | REQ-UI-061 | manual | At 360px open Projects, Beads (List, Board, Focus, Tree), Sessions and Quota: no horizontal page scroll |
| TC-4 | REQ-UI-060 | manual | At 390px focus a text input and a select: text is 16px and the browser does not zoom |
| TC-5 | REQ-UI-062 | manual | Tab through each page: a focus indicator is always visible; with reduced motion on, nothing animates |
