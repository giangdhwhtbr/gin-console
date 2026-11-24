# WBS export

Use case: export-wbs

How gin-console exports a milestone or project work breakdown as Excel, CSV for Jira, or Markdown, including fallback when `gin` is unavailable (REQ-MILESTONE-UI-026 to REQ-MILESTONE-UI-032).

```mermaid
flowchart TD
  subgraph pm[PM]
    start((Start))
    choose[Open Export WBS menu and pick Excel, CSV for Jira, or Markdown]
    save[Save downloaded WBS file]
  end
  subgraph server[Console server]
    validate{Valid project, milestone, and format?}
    reject[Respond 404 or 422]
    snap[Read Beads snapshot with closed beads, excluding prep and merge gates]
    snapCheck{Beads export readable?}
    beadsFail[Respond 502 with the reason]
    ginCheck{gin milestone list/show succeeded?}
    joinGin[Join planned dates, forecast end, and epic estimates]
    degraded[Leave gin fields blank and record X-WBS-Warning]
    empty{Any rows in scope?}
    emptyDoc[Emit header-only WBS]
    build[Order tree, assign WBS numbers, compute rollups and Depends on]
    serialize[Serialize to xlsx, Jira csv, or md with Content-Disposition]
    done(((End)))
  end
  start --> choose
  choose --> validate
  validate -->|3e invalid| reject
  reject --> done
  validate -->|3 valid| snap
  snap --> snapCheck
  snapCheck -->|4f unreadable| beadsFail
  beadsFail --> done
  snapCheck -->|4 readable| ginCheck
  ginCheck -->|4 ok| joinGin
  ginCheck -->|4e failed| degraded
  joinGin --> empty
  degraded --> empty
  empty -->|4a empty| emptyDoc
  empty -->|5 non-empty| build
  emptyDoc --> serialize
  build --> serialize
  serialize --> save
  save --> done
```
