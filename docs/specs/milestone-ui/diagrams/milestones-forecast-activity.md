# Milestones forecast

How the Milestones page turns `gin-workflow milestone list --json` into the forecast card and the per-milestone lanes and finish (REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008).

```mermaid
flowchart TD
  open([User opens Milestones for a project]) --> api[GET /api/milestones?project=P runs milestone list --all --json]
  api --> ok{Command ok and schema 1?}
  ok -- no --> err([502 with cause; page shows the error and Retry])
  ok -- yes --> model[Models validate; missing forecast and lanes become null]
  model --> fc{forecast is null?}
  fc -- yes --> nocard[No forecast card]
  fc -- no --> card[Forecast card: lanes, open epics, unestimated]
  card --> fe{forecast.error set?}
  fe -- yes --> showerr[Show error in destructive color]
  fe -- no --> fin
  showerr --> fin{finish is null?}
  fin -- yes --> noest[No estimate: every open epic is unestimated]
  fin -- no --> dl{deadline is null?}
  dl -- yes --> nodl[Finishes date, No deadline, roadmap line to add]
  dl -- no --> over{overflow_days > 0?}
  over -- yes --> late[N working days past the deadline, warning color]
  over -- no --> same{finish equals deadline?}
  same -- yes --> ondl[on the deadline]
  same -- no --> spare[N working days spare, counted Mon-Fri after finish up to deadline]
  nocard --> rows
  noest --> rows
  nodl --> rows
  late --> rows
  ondl --> rows
  spare --> rows
  rows[Each milestone row: lanes or dash; Finishes date, warning color when finish after end] --> done([Page shown])
```
