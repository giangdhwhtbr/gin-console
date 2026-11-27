# The console fetches and reads shared bead attachments

Date: 2026-11-27
Status: proposed

## Context
gin-workflow 3.5.0 added `gin attach` (gin-workflow-s6fv): a bead lists its screenshots in `metadata.attachments`, its text points at them as `attachment:<sha256>`, and the default `git-ref` store keeps the blobs at `<aa>/<sha256>` on `refs/gin/attachments`, pushed to `origin`. Screenshots taken on another machine reach a checkout only through a fetch of that ref. gin's reader contract fetches with `+refs/gin/attachments:refs/gin/attachments`, but says that a clone which writes attachments must run `gin attach fetch` instead, because the forced fetch drops blobs not pushed yet; and gin keeps the remote's last tip on `refs/gin/attachments-origin` to tell a prune from a new attachment. The projects the console reads are the clones people work in and attach from, so neither ref is the console's to move. ADR 0003 allows one write, `bd dolt pull`, and says that reading pages start no process. Epic gin-console-rm-shared-attachments asks that everyone see the screenshots, whoever took them.

## Decision
The server runs three git commands, and only in a configured project's directory:
- `git fetch --quiet --no-write-fetch-head origin +refs/gin/attachments:refs/gin-console/attachments`, after that project's `bd dolt pull`, on `POST /api/refresh` and on `beads.pull_interval`, with the same opt-out (`pull: false`), limits and status display as the pull;
- `git ls-tree -r --name-only` on `refs/gin/attachments` and `refs/gin-console/attachments`, at most once per export snapshot, only for a project whose beads have an entry in the `git-ref` store, to tell which attachments are present;
- `git cat-file` on one blob of those refs, when a client requests that attachment.

It reads `refs/gin/attachments` first, so an image attached on this host and not pushed yet shows too, then its own ref. It owns `refs/gin-console/attachments` and moves no other ref: it never writes `refs/gin/attachments` or `refs/gin/attachments-origin`, never pushes, and never runs `gin attach`. It checks each blob's SHA-256, image type and size before serving it, and lets the browser cache it for good, since its name is its hash. The `local` store is read as files inside the project; the `s3` store is not read.

Rejected: a bare cache repository per project owned by the console, which never writes to the project but needs a writable folder, a Docker volume, the remote's URL and its own credentials, and stores every blob twice; and running `gin attach fetch`, which merges into the store gin writes and can commit to `refs/gin/attachments`, a write far beyond ADR 0003.

## Consequences
The console writes objects and one ref of its own into each project's `.git`. The ref is outside `refs/heads` and `refs/tags`, so a usual push does not send it; `git push --mirror` would. Reading a bead list or a bead page of a project that uses the shared store can start `git ls-tree`, and each attachment request starts `git cat-file`, which ADR 0003 ruled out for reading pages; a project without such entries still starts no process. The service needs read access to each `origin` (an SSH key without a passphrase for `git+ssh`), as for `bd dolt pull`, and the Docker image carries git already. Tests inject the git runner, so no test starts git.
