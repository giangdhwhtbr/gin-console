# Bead images

Use case: see-bug-screenshots

How the console finds the images a bead names, decides which it may serve, and shows them in the description, the Images panel and the lightbox (REQ-BEADS-026 to REQ-BEADS-030, REQ-UI-028, REQ-CONFIG-008).

```mermaid
flowchart TD
  subgraph dev[Developer]
    start((Start))
    open[Open a bead]
    tile[Open a tile]
    step[Press left or right arrow]
    esc[Press Escape]
  end
  subgraph server[Server]
    find[Find image paths in description and notes]
    textOk{Path text allowed?}
    inside{File inside the project or an evidence folder?}
    image{At most 10 MB and image bytes?}
    yes[Mark available]
    no[Mark not available]
    serve{Request for image n: still available?}
    bytes[Answer the bytes with nosniff and CSP]
    nf[Answer 404]
  end
  subgraph page[Console page]
    any{Bead names images?}
    none[No Images panel]
    show[Show available images inline and as tiles]
    missing[Show Not on this host for the others]
    external[Show external images as links]
    box[Show the image large with caption and k of m]
    finish(((End)))
  end
  start --> open
  open --> find
  find --> textOk
  textOk -->|2a no| no
  textOk -->|yes| inside
  inside -->|2a no| no
  inside -->|yes| image
  image -->|2a no| no
  image -->|2 yes| yes
  yes --> any
  no --> any
  any -->|no| none
  any -->|3 yes| show
  show --> missing
  missing --> external
  external --> tile
  tile --> serve
  serve -->|5 yes| bytes
  serve -->|5e no| nf
  bytes --> box
  nf --> finish
  box --> step
  step --> box
  box --> esc
  esc --> finish
  none --> finish
```
