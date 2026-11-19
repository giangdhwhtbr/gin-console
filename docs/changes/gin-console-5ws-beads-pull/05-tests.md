# Tests: Beads pull

Automated tests carry the REQ-ID in the test name or a comment. List here only manual or QE cases.

| TC | REQ | type | evidence |
|---|---|---|---|
| TC-1 | REQ-BEADS-016, REQ-BEADS-017, REQ-BEADS-018, REQ-BEADS-012 | manual | On the deployed console, "Refresh data" pulls gin-console over SSH and its card shows "pulled …", and gin-harness (no Dolt remote) shows "no Dolt remote"; on a temporary console with `beads.pull_interval: 1m` and temporary Beads databases sharing a `file://` remote, a bead pushed from another database appears after one Refresh and, without Refresh, within two minutes, and a project whose remote is unreachable shows "pull failed: …" on its card and the note on the Beads and My Tasks pages; screenshots at 1440×900 and 390×844 |
