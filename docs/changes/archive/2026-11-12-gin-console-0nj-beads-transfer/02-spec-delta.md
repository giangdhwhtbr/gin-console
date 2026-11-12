# Spec Delta: Beads transfer

## ADDED

### REQ-SERVER-011: Compressed responses
WHEN a client that sends `Accept-Encoding` naming `gzip` requests any path, the server SHALL compress a response body of at least 1000 bytes with gzip and send `Content-Encoding: gzip`, and SHALL send a smaller body, or any body to a client that does not accept gzip, uncompressed.

#### Scenario: Large API answer
- GIVEN a project whose bead list serializes to more than 1000 bytes
- WHEN a client sends `GET /api/beads?project=<name>&closed=1` with `Accept-Encoding: gzip`
- THEN the response has `Content-Encoding: gzip` and decompresses to the same JSON as without gzip

#### Scenario: Small answer
- GIVEN the server is running
- WHEN a client sends `GET /api/health` with `Accept-Encoding: gzip`
- THEN the response has no `Content-Encoding` header

#### Scenario: Client without gzip
- GIVEN the same project
- WHEN a client sends `GET /api/beads?project=<name>&closed=1` with `Accept-Encoding: identity`
- THEN the response has no `Content-Encoding` header

### REQ-BEADS-014: Bead list revalidation
WHEN the server answers `GET /api/beads` with 200, it SHALL send `ETag: W/"<tag>"`, where `<tag>` is derived from the response body so that two equal bodies have the same tag and two different bodies have different tags, together with `Cache-Control: no-cache`; WHEN the request's `If-None-Match` names that tag, the server SHALL answer 304 with the same `ETag` and no body; and it SHALL send no `ETag` with a 404 or 502 answer.

#### Scenario: Same list
- GIVEN a project whose beads did not change between two requests
- WHEN a client requests `GET /api/beads?project=<name>` twice
- THEN both answers are 200 with the same `ETag` and `Cache-Control: no-cache`

#### Scenario: Not modified
- GIVEN a client holds the `ETag` of the current bead list
- WHEN it requests the list again with `If-None-Match` set to that `ETag`
- THEN the answer is 304 with that `ETag` and an empty body

#### Scenario: Changed list
- GIVEN a client holds the `ETag` of a bead list, and a bead's title changes in the export
- WHEN it requests the list with `If-None-Match` set to that `ETag`
- THEN the answer is 200 with the new list and a different `ETag`

#### Scenario: Show closed
- GIVEN a project with closed beads
- WHEN a client requests the list without and with `closed=1`
- THEN the two `ETag` values differ

#### Scenario: Failure
- GIVEN the project's export cannot be read as in REQ-BEADS-005
- WHEN a client requests its beads with any `If-None-Match`
- THEN the answer is 502 with an `error` and no `ETag`

## MODIFIED

## REMOVED
