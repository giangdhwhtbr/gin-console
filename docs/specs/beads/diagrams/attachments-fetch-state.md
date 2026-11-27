# Attachment fetch status

The result of a project's last fetch of the shared attachment store, kept in the server's memory per project and returned as `attachments_fetch` by `GET /api/projects/beads` (REQ-BEADS-033). It is lost when the server restarts.

```mermaid
stateDiagram-v2
  [*] --> NotFetched
  NotFetched --> Ok: fetch exits 0
  NotFetched --> NoStore: fetch says the remote ref is missing
  NotFetched --> NoRemote: fetch says origin is no git repository
  NotFetched --> Error: fetch fails otherwise, times out, or git is missing
  Ok --> Ok: fetch exits 0
  Ok --> Error: fetch fails
  Ok --> NoStore: remote ref deleted
  NoStore --> Ok: someone pushes the store and fetch exits 0
  NoStore --> NoStore: remote ref still missing
  NoRemote --> Ok: origin added and fetch exits 0
  Error --> Ok: a later fetch exits 0
  Error --> Error: fetch fails again
  NotFetched --> [*]: project sets pull false
```
