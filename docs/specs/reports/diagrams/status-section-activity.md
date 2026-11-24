# Status section

Use case: review-milestone-status

How the Status section turns one project's `bd export` snapshot, the Milestones list and the milestone's detail into a verdict, figures, a burn-up, changes, risks and an epic table (REQ-REPORTS-020 to REQ-REPORTS-033).

```mermaid
flowchart TD
  subgraph pm[PM]
    start((Start))
    open[Open Reports]
    read[Read the verdict and the risks]
    pick[Pick a scope]
    retry[Press Retry]
    copyBtn[Click Copy summary]
    openEpic[Open an epic or a blocked bead]
  end
  subgraph page[Console page]
    redirect[Go to /reports/status and write the default milestone into the URL]
    any{Project has milestones?}
    noMs[Select the last 30 days; say there are no milestones yet, with gin milestone create]
    scope{Milestone or period?}
    periodView[Show beads closed, rework and blocked for the period, and Pick a milestone]
    ok{Status report answered?}
    error[Show the error and Retry]
    side{Milestones list and detail answered?}
    full[Verdict from pace, late rule and risks; figures; burn-up; changes; risks; epic table with planned and forecast dates]
    partial[Same, with the verdict without forecast and dashes for planned, forecast and epic verdicts]
    clipOk{Clipboard write succeeded?}
    copied[Show Copied for 2s]
    copyErr[Show Couldn't copy]
    beadPage[Show the bead page, remembering the Status section]
    done(((End)))
  end
  subgraph server[Console server]
    snap[Read the snapshot and the reopens, no process]
    history[Rebuild each epic's milestone and points per day from milestone_moves and points_history]
    build[Burn-up, figures now and a week ago, changes since kickoff, risks, epic rows]
  end
  start --> open
  open --> redirect
  redirect --> any
  any -->|2a no milestones| noMs
  noMs --> done
  any -->|2 yes| scope
  scope -->|4b period| periodView
  periodView --> done
  scope -->|3 milestone| snap
  snap --> history
  history --> build
  build --> ok
  ok -->|3e failed| error
  error --> retry
  retry --> snap
  ok -->|3 answered| side
  side -->|3 both answered| full
  side -->|3f one failed| partial
  full --> read
  partial --> read
  read --> pick
  pick --> scope
  read --> copyBtn
  copyBtn --> clipOk
  clipOk -->|4c ok| copied
  clipOk -->|4e failed| copyErr
  copied --> read
  copyErr --> read
  read --> openEpic
  openEpic --> beadPage
  beadPage --> done
```
