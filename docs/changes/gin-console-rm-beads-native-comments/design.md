# Design: Comments and authors

Epic: gin-console-rm-beads-native

## Architecture
- Backend (`beads/`): `models.py` gains `Comment` (`id`, `author`, `text`, `created_at`, `truncated`, strict, `Text` cleaning) and `BeadSummary.created_by`; `BeadDetail` gains `design`, `notes`, `acceptance_criteria` and `close_reason` (null when empty). `source.py` gains `get_comments(run, cwd, bead_id)` that validates the id, runs `bd comments --json -- <id>` with `json_on_failure=True`, maps the `{"error": ... no issue ...}` answer to `BeadNotFound` as `get_bead` does, drops malformed comments and cuts texts to 20000 characters. `router.py` adds `GET /beads/{project}/{bead_id}/comments` with its own `KeyedCache` (key project and bead, 5 s) and the same 404 and 502 mapping. `bd comments` is the only new command and is read-only.
- Frontend (`features/beads/`): `api.ts` gains `Comment`, `fetchComments(project, id)` with a guard, and the new detail fields; `CommentList.tsx` owns its fetch, loading, error and Retry state (like `BeadDetailPage`, remounted by the page's `key`); `BeadDetailPage.tsx` renders "Created by" and the text sections (a small `TextSection.tsx` for one titled plain-text block) and mounts `CommentList` when `comment_count > 0`.
- Why a separate endpoint: the bead page shows at once and a long comment thread or a `bd comments` failure never blocks it.

## Data Flow
Browser opens `/beads/<project>/<id>` -> detail request (fields, text sections, relations) -> when `comment_count > 0`, `CommentList` requests `/comments` -> comments in order. A route change remounts the page (key), so a late comments answer lands on an unmounted component.

## Error Handling
`bd comments` problems become a 502 `{error}`; unknown project, bead or an unsafe id is a 404 (the id regex runs before any command). A malformed comment is dropped, not fatal. Strings are cleaned of lone surrogates. The UI shows a comments error with its own Retry and keeps the page; an unexpected shape is an error, never a blank page. Everything from `bd` is rendered as React text.

## Testing
Backend: fake runner with canned `comments` output; order, truncation at 20000, empty list, malformed row dropped, unknown bead (the error answer) and project 404, unsafe ids run nothing, 502 for failure and bad shape and not cached, cache reuse, lone surrogates; detail with and without `created_by`, `design`, `notes`, `acceptance_criteria`, `close_reason`; list rows with `created_by`. Frontend (vitest): guards; text sections present and absent and their order; plain text; "Created by" shown and hidden; comments loading, list, none requested for count 0, truncated note, failure with Retry, unexpected shape, late answer after navigation. One real-host check against the comment of `qwikfone-02a.1`.
