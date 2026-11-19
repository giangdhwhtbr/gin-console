# Scheduled pull

Use case: scheduled-beads-pull

How the server pulls every project on `beads.pull_interval` without a refresh (REQ-BEADS-017, REQ-BEADS-016). Each project's pull is classified as in the Beads pull diagram.

```mermaid
flowchart TD
  subgraph scheduler[Scheduler]
    start((Start))
    wait[Wait pull_interval]
  end
  subgraph server[Server]
    pullall[Pull every project, at most four at a time]
    failed{Any project's pull failed?}
    log[Log each failed project with its error]
    clear[Drop every snapshot and cached answer]
    stopping{Server stopping?}
    done(((End)))
  end
  start --> wait
  wait --> pullall
  pullall --> failed
  failed -->|2e yes| log
  failed -->|1 no| clear
  log --> clear
  clear --> stopping
  stopping -->|5 no| wait
  stopping -->|yes| done
```
