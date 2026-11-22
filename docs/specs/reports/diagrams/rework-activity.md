# Rework

How the Quality tab and the Team figures count rework from Beads, with no AI usage data (REQ-REPORTS-005, REQ-REPORTS-009, REQ-REPORTS-010, REQ-REPORTS-019, REQ-UI-091).

Use case: review-rework

```mermaid
flowchart TD
  subgraph lead[Team lead]
    start((Start))
    open[Open Reports, pick project and period, select Quality]
    epic[Open an epic from its row]
  end
  subgraph server[Server]
    snap[Read the issues.jsonl snapshot and select the closed beads of the period]
    failed{A project failed?}
    note[Keep its error under errors and go on with the others]
    logq{Interaction log present?}
    changed{Log changed since last read?}
    reread[Read the log and keep the reopens per bead]
    keep[Use the kept reopens]
    none[Count no reopens for the project]
    bugs[Count bugs found later from discovered-from dependencies]
    rows[Sum reopens and bugs per member and per epic, rework rate per row]
  end
  subgraph browser[Browser]
    anyq{Any closed bead?}
    show[Show figures, member rows and epic rows; warning above the tabs for each failed project]
    empty[Show the rate as a dash and No data in this period]
    finish(((End)))
  end
  start --> open
  open --> snap
  snap --> failed
  failed -->|2e yes| note
  failed -->|2 no| logq
  note --> logq
  logq -->|2 yes| changed
  logq -->|2a no| none
  changed -->|yes| reread
  changed -->|no| keep
  reread --> bugs
  keep --> bugs
  none --> bugs
  bugs --> rows
  rows --> anyq
  anyq -->|3 yes| show
  anyq -->|3a no| empty
  show --> epic
  epic --> finish
  empty --> finish
```
