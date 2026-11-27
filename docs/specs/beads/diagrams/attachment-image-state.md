# Attachment on this host

An attachment of a bead as the console sees it (REQ-BEADS-031): worked out from the bead's `metadata.attachments` entry in `.beads/issues.jsonl` and from the blobs of `refs/gin/attachments` and `refs/gin-console/attachments`, again for each export snapshot. Its state is the `reason` of the image, `null` when available.

```mermaid
stateDiagram-v2
  [*] --> NotListed: text names attachment:<sha256> with no entry
  [*] --> NotFetched: entry reaches this host through bd dolt pull
  [*] --> UnsupportedStore: entry with a store other than git-ref or local
  NotListed --> NotFetched: entry reaches this host
  NotFetched --> Available: fetch or gin attach add brings the blob, or the local file appears
  Available --> NotFetched: blob or local file gone
  NotFetched --> Pruned: gin attach prune sets pruned_at
  Available --> Pruned: gin attach prune sets pruned_at
  Pruned --> [*]
  UnsupportedStore --> [*]
  Available --> [*]: bead loses the entry and the reference
```
