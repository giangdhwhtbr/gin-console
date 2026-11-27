# Design: Evidence images from local files

Epic: gin-console-rm-evidence-images

## Architecture

Backend:
- `config.py`: `ProjectEntry.evidence_roots: list[Path]` (default empty), each absolute, checked like `path` (REQ-CONFIG-008).
- `beads/images.py` (new): pure functions. `image_refs(text) -> list[ImageRef]` finds the paths of REQ-BEADS-026 in one text; `resolve_images(entry, refs) -> list[BeadImage]` turns them into absolute paths under the rules of REQ-BEADS-027 and marks each `available`; `read_image(path, roots) -> tuple[bytes, str] | None` re-checks and reads one image for the route. Path guards follow `requirements/files.py` (`_file`, `_REFUSED`): reject `..`, `\`, NUL and a `:` other than the `file://` prefix and a Windows drive in an absolute path, before touching the disk; `Path.resolve()` then `is_relative_to` one of the allowed folders, themselves resolved.
- `beads/source.py`: when the snapshot is turned into beads, each bead gets its images once (description, then notes); `BeadSummary.image_count` and `BeadDetail.images` come from them. The work is kept with the snapshot, so a list request does not stat the files again.
- `beads/router.py`: `GET /api/beads/{project}/{id}/images/{n}` returns a plain `Response` with the bytes, the media type from the first bytes, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`, `Content-Disposition: inline` and `Cache-Control: private, no-cache`, as the mockup route does (`requirements/router.py:99-109`).

Frontend:
- `features/beads/api.ts`: `image_count` on `BeadSummary`, `images: BeadImage[]` on `BeadDetail`, `imageUrl(project, id, n)`.
- `features/beads/MarkdownView.tsx`: an `img` component and an `a` rule. It takes an optional `images` resolver: a bead page passes one that maps an image address to the bead's image; every other caller passes none, so its external images become links and other images their alt text.
- `features/beads/images/ImagesPanel.tsx` and `Lightbox.tsx` (base-ui `Dialog`, as `features/jump/JumpPalette.tsx`), mounted from `BeadBody.tsx`, so the bead page, the epic page and the details panel get them.
- `features/beads/CountBadge.tsx`: kind `images` (icon `Image`), used by `BeadCard.tsx` and `ListRow.tsx`; `lib/definitions.ts` gets the sentence of its tooltip.

Rules of the change: the browser never sends a path; one module decides what an image of a bead is and whether it may be served.

## Data Flow

- [Bead images activity](docs/specs/beads/diagrams/bead-images-activity.md) (use case: [See a bug's screenshots](docs/specs/beads/use-cases/see-bug-screenshots.md)).
- [Evidence folders activity](docs/specs/config/diagrams/evidence-folders-activity.md).

## Error Handling

- Missing file, outside the allowed folders, symlink leading outside, over 10 MB, unknown first bytes (SVG included), unreadable (`OSError`): not available; the panel shows "Not on this host" with the written path, the count leaves it out, the route answers 404 with no reason.
- A file changed or removed after the snapshot: the route checks again and answers 404; the thumbnail then shows "Not on this host".
- A path with `..`, `\`, NUL or a stray `:`: refused before any disk access.
- A folder of `evidence_roots` that does not exist: serves nothing; a relative one stops startup (REQ-CONFIG-003).
- More than 50 image paths in a bead: the first 50 are kept.
- An unreadable export: 502 as today (REQ-BEADS-005) on the list and the detail; the image route answers its one 404, since an `<img>` gains nothing from a 502.
- A path is opened once, without following a final symlink and without blocking (a FIFO is refused), and the size, type and file identity are checked on that open file, so a swap between the check and the read cannot serve another file.

## Testing

- `pytest`: `test_bead_images.py` (each written form, `~`, relative, `file://` with `%20`, duplicates, captions, order, 50 limit; each availability rule, symlink in and out, `..`, size, magic bytes, SVG, a folder of `evidence_roots`), `test_beads_api.py` additions (`image_count`, `images`), `test_bead_images_api.py` (200 with headers, every 404, a file removed after the snapshot), `test_config.py` (`evidence_roots` absolute, relative refused).
- `vitest`: `MarkdownView.test.tsx` (bead image inline, external image as link with no request, other image as alt text, link to a bead image opens the lightbox, callers without a resolver), `ImagesPanel.test.tsx`, `Lightbox.test.tsx` (keys, Escape, focus back, Open original, skipping missing images), `CountBadge.test.tsx`, `BeadCard.test.tsx`, `ListRow.test.tsx`.
- QA track: gin-qa cases and Playwright specs for a bug with an image in the project folder, one missing, the lightbox by keyboard, the indicator, and the page at 390px; api cases for the route and the path rules.

## Open Technical Questions
