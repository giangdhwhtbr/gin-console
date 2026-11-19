# Pull status

The result of a project's last pull, kept in the server's memory per project and returned as `pull` by `GET /api/projects` and `GET /api/projects/beads` (REQ-BEADS-016). It is lost when the server restarts.

```mermaid
stateDiagram-v2
  [*] --> NotPulled
  NotPulled --> Ok: pull exits 0
  NotPulled --> NoRemote: pull exits non-zero saying no remote
  NotPulled --> Error: pull exits non-zero otherwise, times out, or bd is missing
  Ok --> Ok: pull exits 0
  Ok --> Error: pull fails
  Ok --> NoRemote: remote removed
  Error --> Ok: a later pull exits 0
  Error --> Error: pull fails again
  NoRemote --> Ok: remote added and pull exits 0
  NoRemote --> NoRemote: pull says no remote
  NotPulled --> [*]: project sets pull false
```
