# Shared attachments

Use case: see-shared-screenshots

How the console fetches the shared attachment store, decides which attachments of a bead it may show, and serves them (REQ-BEADS-026, REQ-BEADS-027, REQ-BEADS-029, REQ-BEADS-031 to REQ-BEADS-034, REQ-UI-028).

```mermaid
flowchart TD
  subgraph member[Team member]
    start((Start))
    refresh[Refresh data, or the schedule fires]
    open[Open a bead]
    tile[Open a tile]
  end
  subgraph server[Server]
    pull[Run bd dolt pull]
    fetch[Fetch the store into refs/gin-console/attachments]
    fetched{Fetch result?}
    keepOk[Keep ok]
    keepQuiet[Keep no_store or no_remote]
    keepErr[Keep the error]
    find[Find files and attachments in the text, then unnamed entries]
    pair{Attachment with a local line below?}
    present{Entry listed, not pruned, store readable, blob present?}
    fileOk{Its file available?}
    asAttachment[Serve as attachment]
    asFile[Serve as file]
    reason[Not available, with its reason]
    check{Hash, image type and size right?}
    bytes[Answer the bytes, cached for good]
    nf[Answer 404]
  end
  subgraph page[Console page]
    note[Show the fetch failed note]
    show[Show images inline and as tiles]
    caption[Show the caption in the tile]
    box[Show the image large]
    finish(((End)))
  end
  start --> refresh
  refresh --> pull
  pull --> fetch
  fetch --> fetched
  fetched -->|2 ok| keepOk
  fetched -->|2b no store or no origin| keepQuiet
  fetched -->|2a failed| keepErr
  keepErr --> note
  note --> open
  keepOk --> open
  keepQuiet --> open
  open --> find
  find --> pair
  pair -->|4 yes, one image| present
  pair -->|no| present
  present -->|4 yes| asAttachment
  present -->|4a no| fileOk
  fileOk -->|4a yes| asFile
  fileOk -->|4a no| reason
  asAttachment --> show
  asFile --> show
  reason --> show
  show --> tile
  tile --> check
  check -->|7 yes| bytes
  check -->|7e no| nf
  bytes --> box
  nf --> caption
  box --> finish
  caption --> finish
```
