# Tests: Milestone catchup

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-MILESTONE-UI-019, REQ-MILESTONE-UI-020, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-013, REQ-REPORTS-017 | manual | On the deployed console with a copy of the example project whose milestone bead holds a `[gin close]` comment and two `[gin retro]` comments (one member twice), and whose milestone has `integration` and `away` metadata: the Retro tab reads "Retro 2" and shows the close block and the newest retro per member; the header shows Integration, Deadline (when the roadmap has one) and Away; Gantt warnings read as sentences; an in-progress epic shows "<n>d left"; the Team tab of a project without milestones offers `gin milestone create`; screenshots at 1440×900 and 390×844 |
