# Tests: Beads jsonl

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1: on the Tailscale deploy with `export.auto` on (interval 1s) for gin-console, gin-harness and gin-workflow, the Beads page, My Tasks and Projects load for every project; `pgrep -fa "bd export"` and `pgrep -fa "bd history"` stay empty while clicking through the Beads page, a bead page, My Tasks and Reports (the `bd list`/`bd show` that `gin state` runs for the `workflow` block are out of scope); the bead page shows no "Reopened" text; two `bd update` writes within one second show the stale note, and `bd export -o .beads/issues.jsonl` clears it | REQ-BEADS-003, REQ-BEADS-005, REQ-BEADS-013, REQ-UI-086, REQ-UI-103 | manual | pass, giangdhwhtbr, 2026-11-11 (Tailscale build of dbe119e) |
