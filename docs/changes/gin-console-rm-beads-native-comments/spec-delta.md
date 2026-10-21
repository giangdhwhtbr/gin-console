# Spec Delta: Comments and authors

## ADDED

### REQ-BEADS-008: Bead comments
WHEN a client requests `GET /api/beads/{project}/{id}/comments`, the server SHALL return the comments of that bead oldest first, each with `id`, `author`, `text`, `created_at` and `truncated`, SHALL cut a text longer than 20000 characters to 20000 and mark it `truncated`, SHALL leave out a comment whose fields have the wrong types, SHALL respond 404 when the project, the id or the bead does not exist, and SHALL respond 502 as in REQ-BEADS-005 when `bd` fails or answers in an unexpected shape.

#### Scenario: Comments in order
- GIVEN a bead with two comments written at different times
- WHEN a client requests its comments
- THEN both are returned oldest first with author, time and text, and `truncated` is false

#### Scenario: Long comment
- GIVEN a comment of 25000 characters
- WHEN a client requests the comments
- THEN its text has 20000 characters and `truncated` is true

#### Scenario: No comments
- GIVEN a bead without comments
- WHEN a client requests its comments
- THEN the response is an empty list

#### Scenario: Malformed comment
- GIVEN `bd` returns one comment whose `text` is a number and one valid comment
- WHEN a client requests the comments
- THEN only the valid comment is returned

#### Scenario: Unknown bead or project
- GIVEN no bead `x-1` and no project `nope`
- WHEN a client requests `/api/beads/<project>/x-1/comments` or `/api/beads/nope/x-1/comments`
- THEN the response is 404

#### Scenario: Unsafe id
- GIVEN a request for the comments of `--help` or `../x`
- WHEN the server handles it
- THEN the response is 404 and no `bd` command ran

#### Scenario: bd fails
- GIVEN `bd comments` exits with a non-zero status
- WHEN a client requests the comments
- THEN the response is 502 with an `error`, and the next request runs the command again

#### Scenario: Cache
- GIVEN the comments were returned less than 5 seconds ago
- WHEN a client requests them again
- THEN `bd` does not run again

### REQ-BEADS-009: Author and text fields
The server SHALL return `created_by` (null when `bd` has none) with every bead of the list and of the detail, and SHALL return with the bead detail the plain-text fields `design`, `notes`, `acceptance_criteria` and `close_reason`, each null when `bd` has none or it is empty.

#### Scenario: Fields present
- GIVEN a bead created by `gin` with a design, notes, acceptance criteria and a close reason
- WHEN a client requests its detail
- THEN `created_by` is `gin` and the four texts are returned

#### Scenario: Fields absent
- GIVEN a bead without notes and with an empty design
- WHEN a client requests its detail
- THEN `notes` and `design` are null

#### Scenario: List rows
- GIVEN a bead created by `gin`
- WHEN a client requests the list
- THEN its row has `created_by` `gin`

### REQ-UI-038: Created by and text sections
The bead page SHALL show "Created by" with the `created_by` name, and SHALL show the sections Acceptance criteria, Design, Notes and Close reason in that order, each only when it has content, as plain text with line breaks.

#### Scenario: Sections with content
- GIVEN a bead with acceptance criteria, notes and a close reason but no design
- WHEN the bead page is shown
- THEN it shows "Created by", Acceptance criteria, Notes and Close reason in that order and no Design section

#### Scenario: Plain text
- GIVEN a design containing `<script>x</script>` and `**bold**`
- WHEN the bead page is shown
- THEN both appear as text and no `script` or `strong` element exists

#### Scenario: No author
- GIVEN a bead whose `created_by` is null
- WHEN the bead page is shown
- THEN "Created by" is not shown

### REQ-UI-039: Comments section
WHEN a bead has comments (`comment_count` above 0), the bead page SHALL load them after the bead is shown and list them under "Comments (N)" oldest first, each with its author, its time and its text as plain text with line breaks, SHALL say "Loading comments…" while they load, SHALL say "Comment truncated" under a truncated comment, and SHALL not request comments and not show the section when `comment_count` is 0.

#### Scenario: Comments listed
- GIVEN a bead with `comment_count` 2
- WHEN the bead page is shown
- THEN "Loading comments…" is shown, then "Comments (2)" with both comments, author, time and text, oldest first

#### Scenario: No comments
- GIVEN a bead with `comment_count` 0
- WHEN the bead page is shown
- THEN no comments request is made and there is no Comments section

#### Scenario: Plain text
- GIVEN a comment containing `<script>x</script>`
- WHEN the comments are shown
- THEN it appears as text and no `script` element exists

#### Scenario: Truncated comment
- GIVEN a comment marked `truncated`
- WHEN the comments are shown
- THEN "Comment truncated" appears under it

### REQ-UI-040: Comments failure and navigation
IF the comments request fails or its answer has an unexpected shape, THEN the Comments section SHALL show the error with its own Retry button that repeats only that request while the rest of the bead page stays shown, and a late comments answer for a bead that is no longer shown SHALL NOT replace the comments of the bead now shown.

#### Scenario: Failure and retry
- GIVEN the comments request answers 502 with `bd comments failed`
- WHEN the bead page is shown
- THEN the bead fields stay shown, the Comments section shows `bd comments failed` and Retry, and Retry loads the comments

#### Scenario: Unexpected shape
- GIVEN the comments answer is `{"x": 1}`
- WHEN the bead page is shown
- THEN the Comments section shows an error and Retry instead of failing

#### Scenario: Late answer
- GIVEN the comments of bead `a-5` are still loading and the user opens bead `a-6`
- WHEN the answer for `a-5` arrives
- THEN `a-6` keeps its own comments
