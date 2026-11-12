# Team tab

How the Team tab of the Reports page turns one project's `bd export` snapshot into a milestone's scope, KPIs and bead list, and which state it shows (REQ-REPORTS-008 to REQ-REPORTS-017).

```mermaid
flowchart TD
  open([User opens /reports, tab team]) --> all{All projects selected?}
  all -- yes --> pick([Pick a project to see its team; no request])
  all -- no --> req[GET /api/reports/team?project=P&milestone=M]
  req --> cache{Answer for P and M cached under 60 s?}
  cache -- yes --> answer
  cache -- no --> snap{Snapshot readable?}
  snap -- no --> fail([502 with error, not cached; tab shows the error and Retry])
  snap -- yes --> ms[List milestone beads with ISO start and end; count the undated]
  ms --> any{Any milestone?}
  any -- no --> none([No milestones yet, with gin-workflow milestone create])
  any -- yes --> sel{M is a listed milestone?}
  sel -- yes --> scope
  sel -- no --> def[Default: active, else open holding today, else next open, else latest closed]
  def --> scope[Scope: non-epic beads under the milestone's epics; bucket open, in_progress or closed; member = assignee or Unassigned]
  scope --> kpi[KPIs for the team and each member; closed per working day; bead rows]
  kpi --> answer[Answer cached for 60 s]
  answer --> late{Still the selected project and milestone?}
  late -- no --> drop([Answer ignored])
  late -- yes --> url[Put milestone in the URL; keep member and status if valid]
  url --> view([Milestone line, figures, status bar, chart, member table, bead list])
  view --> member{User picks a member or presses a member row?}
  member -- yes --> filter[Figures, chart highlight and list follow the member; no new request]
  filter --> view
```
