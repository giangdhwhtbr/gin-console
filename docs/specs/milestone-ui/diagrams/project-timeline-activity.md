# Project timeline

Use case: see-project-timeline

How the Milestones page turns `gin milestone list --all --json` and the closed epics of the Beads export into the header finish line and the Timeline (REQ-MILESTONE-UI-033 to REQ-MILESTONE-UI-038).

```mermaid
flowchart TD
  subgraph pm[PM]
    start((Start))
    open[Open Milestones for a project]
    zoom[Pick Weeks, Months or Quarters]
    closed[Turn on Show closed]
    list[Open the List view]
    retry[Press Retry]
    row[Open a milestone or an epic]
  end
  subgraph server[Server]
    run[Run gin milestone list --all --json]
    ok{Command ok and schema 1?}
    fail[Answer 502 with error and cause]
    snap{Beads export readable?}
    hist[Add closed epics with start and close dates]
    nohist[Set closed_epics to null]
  end
  subgraph page[Console page]
    fc{Forecast present?}
    err{Forecast error?}
    header[Header: project finish, deadline, days late]
    errline[Header: Forecast unavailable]
    empty[Say No open work to forecast]
    rows[Draw milestone rows with overrun, epic rows, Not in a milestone]
    windows[Draw milestone windows without forecast bars]
    error[Show the error with Retry]
    showc{Closed epics known?}
    past[Add closed milestones and epics in Done style]
    note[Say Closed epics unavailable and add closed milestones]
    table[Show the list and the forecast card]
    finish(((End)))
  end
  start --> open
  open --> run
  run --> ok
  ok -->|2e no| fail
  ok -->|2 yes| snap
  fail --> error
  error --> retry
  retry --> run
  snap -->|yes| hist
  snap -->|no| nohist
  hist --> fc
  nohist --> fc
  fc -->|3a no| empty
  fc -->|3 yes| err
  err -->|3e yes| errline
  err -->|no| header
  errline --> windows
  header --> rows
  empty --> zoom
  windows --> zoom
  rows --> zoom
  zoom --> closed
  closed -->|4a| showc
  showc -->|yes| past
  showc -->|no| note
  past --> row
  note --> row
  zoom -->|4b| list
  list --> table
  table --> finish
  row --> finish
```
